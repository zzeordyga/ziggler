package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"ziggler_backend/auth"
	"ziggler_backend/database"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type User = database.User
type Task = database.Task

type Client struct {
	Conn   *websocket.Conn
	Send   chan []byte
	UserID uint
}

type Hub struct {
	Clients    map[*Client]bool
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
}

type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type TaskUpdateRequest struct {
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	Status      *string `json:"status,omitempty"`
	AssigneeID  *uint   `json:"assignee_id,omitempty"`
}

var hub *Hub

func init() {

	hub = &Hub{
		Clients:    make(map[*Client]bool),
		Broadcast:  make(chan []byte),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
	go hub.Run()
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client] = true
			log.Printf("Client connected: %d", client.UserID)

		case client := <-h.Unregister:
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.Send)
				log.Printf("Client disconnected: %d", client.UserID)
			}

		case message := <-h.Broadcast:
			for client := range h.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.Clients, client)
				}
			}
		}
	}
}

func HandleWebSocket(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	client := &Client{
		Conn:   conn,
		Send:   make(chan []byte, 256),
		UserID: uint(userID.(int)),
	}

	hub.Register <- client

	go client.WritePump()
	go client.ReadPump()
}

func (c *Client) WritePump() {
	defer func() {
		c.Conn.Close()
	}()

	for message := range c.Send {
		c.Conn.WriteMessage(websocket.TextMessage, message)
	}
	c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
}

func (c *Client) ReadPump() {
	defer func() {
		hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"message": "API is running",
	})
}

func GetUsers(c *gin.Context) {
	var users []User
	if err := database.DB.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

func GetUser(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var user User
	if err := database.DB.First(&user, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func CreateUser(c *gin.Context) {
	var user User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	hashedPassword, err := auth.HashPassword(user.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not process password"})
		return
	}
	user.Password = hashedPassword

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, user)
}

func UpdateUser(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var user User
	if err := database.DB.First(&user, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var updatedUser User
	if err := c.ShouldBindJSON(&updatedUser); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	updatedUser.ID = user.ID
	updatedUser.CreatedAt = user.CreatedAt

	if err := database.DB.Save(&updatedUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, updatedUser)
}

func DeleteUser(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := database.DB.Delete(&User{}, uint(id)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.Status(http.StatusNoContent)
}

func Login(c *gin.Context) {
	var loginReq auth.LoginRequest
	if err := c.ShouldBindJSON(&loginReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	var user User
	if err := database.DB.Where("email = ?", loginReq.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if err := auth.CheckPassword(loginReq.Password, user.Password); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	token, err := auth.GenerateToken(int(user.ID), user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"token":   token,
		"user": gin.H{
			"id":           user.ID,
			"username":     user.Username,
			"email":        user.Email,
			"display_name": user.DisplayName,
			"role":         user.Role,
		},
	})
}

func Register(c *gin.Context) {
	var registerReq auth.RegisterRequest
	if err := c.ShouldBindJSON(&registerReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	var existingUser User
	if err := database.DB.Where("email = ?", registerReq.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User with this email already exists"})
		return
	}

	hashedPassword, err := auth.HashPassword(registerReq.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not process password"})
		return
	}

	newUser := User{
		Username:    registerReq.Username,
		Email:       registerReq.Email,
		Password:    hashedPassword,
		Role:        database.RoleUser,
		DisplayName: registerReq.DisplayName,
	}

	if err := database.DB.Create(&newUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	token, err := auth.GenerateToken(int(newUser.ID), newUser.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Registration successful",
		"token":   token,
		"user": gin.H{
			"id":           newUser.ID,
			"username":     newUser.Username,
			"email":        newUser.Email,
			"display_name": newUser.DisplayName,
			"role":         newUser.Role,
		},
	})
}

func GetProfile(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var user User
	if err := database.DB.First(&user, uint(userID.(int))).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           user.ID,
		"username":     user.Username,
		"email":        user.Email,
		"display_name": user.DisplayName,
		"role":         user.Role,
	})
}

func GetTasks(c *gin.Context) {
	var tasks []Task
	if err := database.DB.Preload("Creator").Preload("Assignee").Preload("Subtasks").Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tasks"})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func GetTask(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var task Task
	if err := database.DB.Preload("Creator").Preload("Assignee").Preload("Subtasks").First(&task, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	c.JSON(http.StatusOK, task)
}

func CreateTask(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var newTask Task
	if err := c.ShouldBindJSON(&newTask); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	newTask.CreatorID = uint(userID.(int))

	if newTask.ParentID != nil {
		var parentTask Task
		if err := database.DB.First(&parentTask, *newTask.ParentID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Parent task not found"})
			return
		}
	}

	if newTask.AssigneeID != nil {
		var assignee User
		if err := database.DB.First(&assignee, *newTask.AssigneeID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Assignee not found"})
			return
		}
	}

	if newTask.Status == "" {
		newTask.Status = database.TaskStatusTodo
	}

	newTask.CreatedAt = time.Now()
	newTask.UpdatedAt = time.Now()

	if err := database.DB.Create(&newTask).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}

	wsMessage := WSMessage{
		Type:    "task_created",
		Payload: newTask,
	}
	if msgBytes, err := json.Marshal(wsMessage); err == nil {
		hub.Broadcast <- msgBytes
	}

	c.JSON(http.StatusCreated, newTask)
}

func UpdateTask(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var task Task
	if err := database.DB.First(&task, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	updatedTask := task

	var updateReq TaskUpdateRequest
	if err := c.ShouldBindJSON(&updateReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	if updateReq.Title != nil {
		updatedTask.Title = *updateReq.Title
	}
	if updateReq.Description != nil {
		updatedTask.Description = *updateReq.Description
	}
	if updateReq.Status != nil {
		updatedTask.Status = *updateReq.Status
	}
	if updateReq.AssigneeID != nil {
		updatedTask.AssigneeID = updateReq.AssigneeID
	}

	updatedTask.UpdatedAt = time.Now()

	if err := database.DB.Save(&updatedTask).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task"})
		return
	}

	wsMessage := WSMessage{
		Type:    "task_updated",
		Payload: updatedTask,
	}
	if msgBytes, err := json.Marshal(wsMessage); err == nil {
		hub.Broadcast <- msgBytes
	}

	c.JSON(http.StatusOK, updatedTask)
}

func DeleteTask(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var task Task
	if err := database.DB.First(&task, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	var subtaskCount int64
	if err := database.DB.Model(&Task{}).Where("parent_id = ?", uint(id)).Count(&subtaskCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check subtasks"})
		return
	}

	if subtaskCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete task with subtasks"})
		return
	}

	// Hard Delete
	// if err := database.DB.Delete(&Task{}, uint(id)).Error; err != nil {
	// 	c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete task"})
	// 	return
	// }

	// Soft Delete
	task.DeletedAt.Time = time.Now()
	task.DeletedAt.Valid = true
	if err := database.DB.Save(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete task"})
		return
	}

	wsMessage := WSMessage{
		Type:    "task_deleted",
		Payload: gin.H{"id": uint(id)},
	}
	if msgBytes, err := json.Marshal(wsMessage); err == nil {
		hub.Broadcast <- msgBytes
	}

	c.Status(http.StatusNoContent)
}

func GetSubtasks(c *gin.Context) {
	idParam := c.Param("id")
	parentID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parent task ID"})
		return
	}

	var subtasks []Task
	if err := database.DB.Where("parent_id = ?", uint(parentID)).Find(&subtasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subtasks"})
		return
	}

	c.JSON(http.StatusOK, subtasks)
}
