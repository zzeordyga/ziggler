package database

import (
	"log"
	"log/slog"
	"os"
	"time"

	"ziggler_backend/config"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() {
	var dialector gorm.Dialector

	switch config.AppConfig.DBDriver {
	case "postgres":
		dsn := config.AppConfig.DatabaseURL
		if dsn == "" {
			log.Fatal("DB_DRIVER=postgres requires DATABASE_URL to be set")
		}
		dialector = postgres.Open(dsn)
		slog.Info("Initializing PostgreSQL database")
	default:
		dialector = sqlite.Open(config.AppConfig.DBPath)
		slog.Info("Initializing SQLite database", "path", config.AppConfig.DBPath)
	}

	gormLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             200 * time.Millisecond,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
			Colorful:                  config.IsDevelopment(),
		},
	)

	var err error
	DB, err = gorm.Open(dialector, &gorm.Config{Logger: gormLogger})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	err = DB.AutoMigrate(&User{}, &Task{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	slog.Info("Database initialized successfully")
}