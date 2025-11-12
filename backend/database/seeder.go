package database

import (
	"log"

	"ziggler_backend/auth"
)

func SeedDatabase() {
	var userCount int64
	DB.Model(&User{}).Count(&userCount)

	if userCount > 0 {
		log.Println("Database already seeded, skipping...")
		return
	}

	log.Println("Seeding database with initial data...")

	hashedPassword, _ := auth.HashPassword("password123")

	users := []User{
		{
			Username:    "john_doe",
			Email:       "john@example.com",
			Password:    hashedPassword,
			Role:        RoleAdmin,
			DisplayName: "John Doe",
		},
		{
			Username:    "jane_smith",
			Email:       "jane@example.com",
			Password:    hashedPassword,
			Role:        RoleUser,
			DisplayName: "Jane Smith",
		},
	}

	for _, user := range users {
		if err := DB.Create(&user).Error; err != nil {
			log.Printf("Failed to create user %s: %v", user.Username, err)
		}
	}

	tasks := []Task{
		{
			Title:       "Main Project Setup",
			Description: "Set up the main project structure",
			CreatorID:   1,
			AssigneeID:  &[]uint{1}[0],
			Status:      TaskStatusInProgress,
		},
		{
			ParentID:    &[]uint{1}[0],
			Title:       "Database Schema",
			Description: "Design and implement database schema",
			CreatorID:   1,
			AssigneeID:  &[]uint{2}[0],
			Status:      TaskStatusTodo,
		},
		{
			ParentID:    &[]uint{1}[0],
			Title:       "API Endpoints",
			Description: "Create REST API endpoints",
			CreatorID:   1,
			AssigneeID:  &[]uint{1}[0],
			Status:      TaskStatusDone,
		},
	}

	for _, task := range tasks {
		if err := DB.Create(&task).Error; err != nil {
			log.Printf("Failed to create task %s: %v", task.Title, err)
		}
	}

	log.Println("Database seeding completed!")
}
