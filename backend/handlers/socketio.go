package handlers

import (
	"log"
	"net/http"
	"strconv"
	"sync"

	"ziggler_backend/auth"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins
		},
	}
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex
	broadcast = make(chan WSMessage, 100)
)

type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

func InitSocketIO() {
	go handleBroadcast()
	log.Printf("WebSocket server initialized")
}

func handleBroadcast() {
	for {
		msg := <-broadcast
		clientsMu.Lock()
		for client := range clients {
			err := client.WriteJSON(msg)
			if err != nil {
				log.Printf("WebSocket write error: %v", err)
				client.Close()
				delete(clients, client)
			}
		}
		clientsMu.Unlock()
	}
}

func getUserRoom(userID int) string {
	return "user_" + strconv.Itoa(userID)
}

func getTaskRoom(taskID string) string {
	return "task_" + taskID
}

func WebSocketHandler(c *gin.Context) {
	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	// Register client
	clientsMu.Lock()
	clients[conn] = true
	clientsMu.Unlock()

	log.Printf("WebSocket client connected from %s", c.Request.RemoteAddr)

	// Send welcome message
	conn.WriteJSON(WSMessage{
		Type: "connected",
		Payload: map[string]interface{}{
			"message": "Connected to WebSocket server",
		},
	})

	// Listen for messages from this client
	for {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("WebSocket read error: %v", err)
			break
		}

		// Handle authentication
		if msgType, ok := msg["type"].(string); ok && msgType == "authenticate" {
			if token, ok := msg["token"].(string); ok {
				claims, err := auth.ValidateToken(token)
				if err != nil {
					conn.WriteJSON(WSMessage{
						Type:    "auth_error",
						Payload: "Invalid token",
					})
					break
				}

				log.Printf("WebSocket client authenticated: user %d", claims.UserID)
				conn.WriteJSON(WSMessage{
					Type: "authenticated",
					Payload: map[string]interface{}{
						"user_id": claims.UserID,
						"message": "Successfully authenticated",
					},
				})
			}
		}
	}

	// Unregister client
	clientsMu.Lock()
	delete(clients, conn)
	clientsMu.Unlock()
	log.Printf("WebSocket client disconnected")
}

func SocketIOMiddleware() gin.HandlerFunc {
	return WebSocketHandler
}

func HandleSocketIO(c *gin.Context) {
	WebSocketHandler(c)
}

func BroadcastTaskCreated(task Task) {
	broadcast <- WSMessage{
		Type:    "task_created",
		Payload: task,
	}
}

func BroadcastTaskUpdated(task Task) {
	broadcast <- WSMessage{
		Type:    "task_updated",
		Payload: task,
	}
}

func BroadcastTaskDeleted(taskID uint, assigneeID *uint) {
	broadcast <- WSMessage{
		Type: "task_deleted",
		Payload: map[string]interface{}{
			"id": taskID,
		},
	}
}
