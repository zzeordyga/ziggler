package main

import (
	"ziggler_backend/config"
	"ziggler_backend/database"
	"ziggler_backend/handlers"
	"ziggler_backend/router"

	"github.com/gin-gonic/gin"
)

func main() {
	config.LoadConfig()

	gin.SetMode(config.AppConfig.GinMode)

	database.InitDB()

	database.SeedDatabase()

	handlers.InitWebSocket()

	r := router.New()

	r.Run(":" + config.AppConfig.Port)
}