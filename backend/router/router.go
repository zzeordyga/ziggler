// Package router wires the gin engine with the full route stack.
// Kept separate from package main so httptest-based tests can reuse it.
package router

import (
	"ziggler_backend/handlers"
	"ziggler_backend/middleware"

	"github.com/gin-gonic/gin"
)

func New() *gin.Engine {
	r := gin.Default()

	r.GET("/api/v1/ws", handlers.WebSocketHandler)

	r.Use(middleware.CorsMiddleware())

	api := r.Group("/api/v1")

	api.GET("/health", handlers.HealthCheck)

	api.POST("/auth/register", handlers.Register)
	api.POST("/auth/login", handlers.Login)

	protected := api.Group("/")
	protected.Use(middleware.JWTAuthMiddleware())
	{
		protected.GET("/profile", handlers.GetProfile)

		protected.GET("/tasks", handlers.GetTasks)
		protected.POST("/tasks", handlers.CreateTask)
		protected.GET("/tasks/:id", handlers.GetTask)
		protected.PUT("/tasks/:id", handlers.UpdateTask)
		protected.DELETE("/tasks/:id", handlers.DeleteTask)
		protected.GET("/tasks/:id/subtasks", handlers.GetSubtasks)

		protected.GET("/users", handlers.GetUsers)
		protected.POST("/users", handlers.CreateUser)
		protected.GET("/users/:id", handlers.GetUser)
		protected.PUT("/users/:id", handlers.UpdateUser)
		protected.DELETE("/users/:id", handlers.DeleteUser)

		protected.GET("/stats", handlers.GetStats)
	}

	return r
}