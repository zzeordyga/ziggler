package handlers

import (
	"log"
	"strconv"

	"ziggler_backend/auth"

	"github.com/gin-gonic/gin"
	socketio "github.com/googollee/go-socket.io"
)

var SocketServer *socketio.Server

func InitSocketIO() {
	server := socketio.NewServer(nil)

	server.OnConnect("/", func(s socketio.Conn) error {
		log.Printf("Socket.IO client connected: %s", s.ID())
		return nil
	})

	server.OnEvent("/", "authenticate", func(s socketio.Conn, token string) {

		claims, err := auth.ValidateToken(token)
		if err != nil {
			log.Printf("Authentication failed for socket %s: %v", s.ID(), err)
			s.Emit("auth_error", "Invalid token")
			s.Close()
			return
		}

		s.SetContext(map[string]interface{}{
			"user_id": claims.UserID,
			"email":   claims.Email,
		})

		log.Printf("Socket %s authenticated for user %d", s.ID(), claims.UserID)
		s.Emit("authenticated", map[string]interface{}{
			"user_id": claims.UserID,
			"message": "Successfully authenticated",
		})

		s.Join(getUserRoom(claims.UserID))
	})

	server.OnEvent("/", "join_task", func(s socketio.Conn, taskID string) {

		s.Join(getTaskRoom(taskID))
		log.Printf("Socket %s joined task room: %s", s.ID(), taskID)
	})

	server.OnEvent("/", "leave_task", func(s socketio.Conn, taskID string) {

		s.Leave(getTaskRoom(taskID))
		log.Printf("Socket %s left task room: %s", s.ID(), taskID)
	})

	server.OnDisconnect("/", func(s socketio.Conn, reason string) {
		log.Printf("Socket.IO client disconnected: %s, reason: %s", s.ID(), reason)
	})

	server.OnError("/", func(s socketio.Conn, e error) {
		log.Printf("Socket.IO error: %v", e)
	})

	SocketServer = server
	log.Printf("Socket.IO server initialized successfully")
}

func getUserRoom(userID int) string {
	return "user_" + strconv.Itoa(userID)
}

func getTaskRoom(taskID string) string {
	return "task_" + taskID
}

func SocketIOMiddleware() gin.HandlerFunc {
	return gin.WrapH(SocketServer)
}

func HandleSocketIO(c *gin.Context) {
	log.Printf("Socket.IO request received: %s %s %s", c.Request.Method, c.Request.URL.Path, c.Request.URL.RawQuery)

	origin := c.Request.Header.Get("Origin")
	if origin == "" {
		origin = "http://localhost:3000"
	}

	c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
	c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
	c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With")
	c.Writer.Header().Set("Access-Control-Max-Age", "86400")

	if c.Request.Method == "OPTIONS" {
		c.Status(200)
		return
	}

	if SocketServer == nil {
		log.Printf("Socket.IO server is nil!")
		c.JSON(500, gin.H{"error": "Socket.IO server not initialized"})
		return
	}

	SocketServer.ServeHTTP(c.Writer, c.Request)
}

func BroadcastTaskCreated(task Task) {
	if SocketServer == nil {
		return
	}

	message := map[string]interface{}{
		"type":    "task_created",
		"payload": task,
	}

	SocketServer.BroadcastToNamespace("/", "task_created", message)

	if task.AssigneeID != nil {
		userRoom := getUserRoom(int(*task.AssigneeID))
		SocketServer.BroadcastToRoom("/", userRoom, "task_assigned", message)
	}
}

func BroadcastTaskUpdated(task Task) {
	if SocketServer == nil {
		return
	}

	message := map[string]interface{}{
		"type":    "task_updated",
		"payload": task,
	}

	SocketServer.BroadcastToNamespace("/", "task_updated", message)

	taskRoom := getTaskRoom(strconv.Itoa(int(task.ID)))
	SocketServer.BroadcastToRoom("/", taskRoom, "task_updated", message)

	if task.AssigneeID != nil {
		userRoom := getUserRoom(int(*task.AssigneeID))
		SocketServer.BroadcastToRoom("/", userRoom, "task_updated", message)
	}
}

func BroadcastTaskDeleted(taskID uint, assigneeID *uint) {
	if SocketServer == nil {
		return
	}

	message := map[string]interface{}{
		"type": "task_deleted",
		"payload": map[string]interface{}{
			"id": taskID,
		},
	}

	SocketServer.BroadcastToNamespace("/", "task_deleted", message)

	taskRoom := getTaskRoom(strconv.Itoa(int(taskID)))
	SocketServer.BroadcastToRoom("/", taskRoom, "task_deleted", message)

	if assigneeID != nil {
		userRoom := getUserRoom(int(*assigneeID))
		SocketServer.BroadcastToRoom("/", userRoom, "task_deleted", message)
	}
}
