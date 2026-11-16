package config

import (
	"log/slog"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	DBDriver           string
	DBPath             string
	DatabaseURL        string
	JWTSecret          string
	AppEnv             string
	GinMode            string
	CorsAllowedOrigins string
	CorsAllowCreds     string
}

var AppConfig *Config

func LoadConfig() {
	if err := godotenv.Load(); err != nil {
		slog.Debug("No .env file found, using system environment variables")
	}

	AppConfig = &Config{
		Port:               getEnv("PORT", "8080"),
		DBDriver:           getEnv("DB_DRIVER", "sqlite"),
		DBPath:             getEnv("DB_PATH", "ziggler.db"),
		DatabaseURL:        getEnv("DATABASE_URL", ""),
		JWTSecret:          getEnv("JWT_SECRET", ""),
		AppEnv:             getEnv("APP_ENV", "development"),
		GinMode:            getEnv("GIN_MODE", "debug"),
		CorsAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "*"),
		CorsAllowCreds:     getEnv("CORS_ALLOW_CREDENTIALS", "true"),
	}

	// Structured logging: JSON in production, text in development.
	if IsProduction() {
		slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))
	} else {
		slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})))
	}

	if AppConfig.JWTSecret == "" {
		slog.Error("JWT_SECRET environment variable is required")
		os.Exit(1)
	}

	if len(AppConfig.JWTSecret) < 32 {
		slog.Error("JWT_SECRET must be at least 32 characters long for security")
		os.Exit(1)
	}

	if AppConfig.DBDriver == "postgres" && AppConfig.DatabaseURL == "" {
		slog.Error("DB_DRIVER=postgres requires DATABASE_URL to be set")
		os.Exit(1)
	}

	slog.Info("Configuration loaded",
		"env", AppConfig.AppEnv,
		"port", AppConfig.Port,
		"db_driver", AppConfig.DBDriver,
	)
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func GetJWTSecret() []byte {
	return []byte(AppConfig.JWTSecret)
}

func IsProduction() bool {
	return AppConfig.AppEnv == "production"
}

func IsDevelopment() bool {
	return AppConfig.AppEnv == "development"
}