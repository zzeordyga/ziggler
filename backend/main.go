package main

import (
	"ziggler_backend/config"
	"ziggler_backend/database"
	"ziggler_backend/handlers"
	"ziggler_backend/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	config.LoadConfig()

	gin.SetMode(config.AppConfig.GinMode)

	database.InitDB()

	database.SeedDatabase()

	r := gin.Default()

	r.Use(middleware.CorsMiddleware())

	api := r.Group("/api/v1")

	api.GET("/health", handlers.HealthCheck)

	api.POST("/auth/register", handlers.Register)
	api.POST("/auth/login", handlers.Login)

	protected := api.Group("/")
	protected.Use(middleware.JWTAuthMiddleware())
	{

		protected.GET("/profile", handlers.GetProfile)

		protected.GET("/ws", handlers.HandleWebSocket)

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

	}

	r.Run(":" + config.AppConfig.Port)
}
