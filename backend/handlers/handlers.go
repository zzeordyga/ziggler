package handlers

import (
	"net/http"
	"strconv"
	"time"

	"ziggler_backend/auth"
	"ziggler_backend/database"

	"github.com/gin-gonic/gin"
)

type User = database.User
type Task = database.Task

type TaskUpdateRequest struct {
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	Status      *string `json:"status,omitempty"`
	AssigneeID  *uint   `json:"assignee_id,omitempty"`
	ParentID    *uint   `json:"parent_id,omitempty"`
	Unassigned  bool    `json:"unassigned,omitempty"`
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

type PaginatedResponse struct {
	Data       []Task `json:"data"`
	Total      int64  `json:"total"`
	Page       int    `json:"page"`
	PageSize   int    `json:"page_size"`
	TotalPages int    `json:"total_pages"`
}

func GetTasks(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 50
	}

	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	validSortFields := map[string]bool{
		"id":          true,
		"title":       true,
		"status":      true,
		"created_at":  true,
		"updated_at":  true,
		"creator_id":  true,
		"assignee_id": true,
	}

	if !validSortFields[sortBy] {
		sortBy = "created_at"
	}

	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	var tasks []Task
	var total int64

	query := database.DB.Preload("Creator").Preload("Assignee").Preload("Subtasks").Where("deleted_at IS NULL")
	countQuery := database.DB.Model(&Task{}).Where("deleted_at IS NULL")

	myTasksOnly := c.Query("my_tasks") == "true"
	if myTasksOnly {
		query = query.Where("assignee_id = ?", uint(userID.(int)))
		countQuery = countQuery.Where("assignee_id = ?", uint(userID.(int)))
	}

	if err := countQuery.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count tasks"})
		return
	}

	offset := (page - 1) * pageSize
	orderClause := sortBy + " " + sortOrder

	if err := query.Order(orderClause).Offset(offset).Limit(pageSize).Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tasks"})
		return
	}

	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))

	response := PaginatedResponse{
		Data:       tasks,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}

	c.JSON(http.StatusOK, response)
}

func GetTask(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var task Task
	if err := database.DB.Preload("Creator").Preload("Assignee").Preload("Subtasks").Where("deleted_at IS NULL").First(&task, uint(id)).Error; err != nil {
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

	if err := database.DB.Preload("Creator").Preload("Assignee").First(&newTask, newTask.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load task relationships"})
		return
	}

	// Broadcast task creation via Socket.IO
	BroadcastTaskCreated(newTask)

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
	if updateReq.ParentID != nil {
		if *updateReq.ParentID != 0 {
			var parentTask Task
			if err := database.DB.First(&parentTask, *updateReq.ParentID).Error; err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Parent task not found"})
				return
			}
			if *updateReq.ParentID == updatedTask.ID {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Task cannot be its own parent"})
				return
			}
			if parentTask.ParentID != nil && *parentTask.ParentID == updatedTask.ID {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Circular dependency detected"})
				return
			}
		}
		updatedTask.ParentID = updateReq.ParentID
	}
	if updateReq.Unassigned {
		updatedTask.AssigneeID = nil
	}

	updatedTask.UpdatedAt = time.Now()

	if err := database.DB.Save(&updatedTask).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task"})
		return
	}

	if err := database.DB.Preload("Creator").Preload("Assignee").First(&updatedTask, updatedTask.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load task relationships"})
		return
	}

	// Broadcast task update via Socket.IO
	BroadcastTaskUpdated(updatedTask)

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

	// Broadcast task deletion via Socket.IO
	BroadcastTaskDeleted(uint(id), task.AssigneeID)

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

type UserStats struct {
	UserID         uint    `json:"user_id"`
	Username       string  `json:"username"`
	DisplayName    string  `json:"display_name"`
	TodoTasks      int64   `json:"todo_tasks"`
	InProgress     int64   `json:"in_progress_tasks"`
	CompletedTasks int64   `json:"completed_tasks"`
	CancelledTasks int64   `json:"cancelled_tasks"`
	TotalTasks     int64   `json:"total_tasks"`
	CompletionRate float64 `json:"completion_rate"`
}

type TaskStats struct {
	TotalTasks      int64 `json:"total_tasks"`
	TodoTasks       int64 `json:"todo_tasks"`
	InProgressTasks int64 `json:"in_progress_tasks"`
	CompletedTasks  int64 `json:"completed_tasks"`
	CancelledTasks  int64 `json:"cancelled_tasks"`
	UnassignedTasks int64 `json:"unassigned_tasks"`
}

type StatsResponse struct {
	OverallStats TaskStats   `json:"overall_stats"`
	UserStats    []UserStats `json:"user_stats"`
	GeneratedAt  time.Time   `json:"generated_at"`
}

func GetStats(c *gin.Context) {
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	targetUserID := c.Query("user_id")

	var userStats []UserStats
	var overallStats TaskStats

	database.DB.Model(&Task{}).Count(&overallStats.TotalTasks)
	database.DB.Model(&Task{}).Where("status = ?", database.TaskStatusTodo).Count(&overallStats.TodoTasks)
	database.DB.Model(&Task{}).Where("status = ?", database.TaskStatusInProgress).Count(&overallStats.InProgressTasks)
	database.DB.Model(&Task{}).Where("status = ?", database.TaskStatusDone).Count(&overallStats.CompletedTasks)
	database.DB.Model(&Task{}).Where("status = ?", database.TaskStatusCancelled).Count(&overallStats.CancelledTasks)
	database.DB.Model(&Task{}).Where("assignee_id IS NULL").Count(&overallStats.UnassignedTasks)

	if targetUserID != "" {

		targetID, err := strconv.ParseUint(targetUserID, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		var user User
		if err := database.DB.First(&user, uint(targetID)).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		var stats UserStats
		stats.UserID = user.ID
		stats.Username = user.Username
		stats.DisplayName = user.DisplayName

		database.DB.Model(&Task{}).Where("assignee_id = ?", user.ID).Count(&stats.TotalTasks)
		database.DB.Model(&Task{}).Where("assignee_id = ? AND status = ?", user.ID, database.TaskStatusTodo).Count(&stats.TodoTasks)
		database.DB.Model(&Task{}).Where("assignee_id = ? AND status = ?", user.ID, database.TaskStatusInProgress).Count(&stats.InProgress)
		database.DB.Model(&Task{}).Where("assignee_id = ? AND status = ?", user.ID, database.TaskStatusDone).Count(&stats.CompletedTasks)
		database.DB.Model(&Task{}).Where("assignee_id = ? AND status = ?", user.ID, database.TaskStatusCancelled).Count(&stats.CancelledTasks)

		if stats.TotalTasks > 0 {
			stats.CompletionRate = float64(stats.CompletedTasks) / float64(stats.TotalTasks) * 100
		}

		userStats = append(userStats, stats)
	} else {

		var users []User
		database.DB.Where("id IN (SELECT DISTINCT assignee_id FROM tasks WHERE assignee_id IS NOT NULL)").Find(&users)

		for _, user := range users {
			var stats UserStats
			stats.UserID = user.ID
			stats.Username = user.Username
			stats.DisplayName = user.DisplayName

			database.DB.Model(&Task{}).Where("assignee_id = ?", user.ID).Count(&stats.TotalTasks)
			database.DB.Model(&Task{}).Where("assignee_id = ? AND status = ?", user.ID, database.TaskStatusTodo).Count(&stats.TodoTasks)
			database.DB.Model(&Task{}).Where("assignee_id = ? AND status = ?", user.ID, database.TaskStatusInProgress).Count(&stats.InProgress)
			database.DB.Model(&Task{}).Where("assignee_id = ? AND status = ?", user.ID, database.TaskStatusDone).Count(&stats.CompletedTasks)
			database.DB.Model(&Task{}).Where("assignee_id = ? AND status = ?", user.ID, database.TaskStatusCancelled).Count(&stats.CancelledTasks)

			if stats.TotalTasks > 0 {
				stats.CompletionRate = float64(stats.CompletedTasks) / float64(stats.TotalTasks) * 100
			}

			userStats = append(userStats, stats)
		}
	}

	response := StatsResponse{
		OverallStats: overallStats,
		UserStats:    userStats,
		GeneratedAt:  time.Now(),
	}

	c.JSON(http.StatusOK, response)
}
