package database

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Username    string         `json:"username" gorm:"uniqueIndex;not null"`
	Email       string         `json:"email" gorm:"uniqueIndex;not null"`
	Password    string         `json:"password,omitempty" gorm:"not null"`
	Role        string         `json:"role" gorm:"default:'user'"`
	DisplayName string         `json:"display_name"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`

	// Relationships
	CreatedTasks  []Task `json:"created_tasks,omitempty" gorm:"foreignKey:CreatorID"`
	AssignedTasks []Task `json:"assigned_tasks,omitempty" gorm:"foreignKey:AssigneeID"`
}

type Task struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	ParentID    *uint          `json:"parent_id,omitempty"`
	Title       string         `json:"title" gorm:"not null"`
	Description string         `json:"description"`
	CreatorID   uint           `json:"creator_id" gorm:"not null"`
	AssigneeID  *uint          `json:"assignee_id,omitempty"`
	Status      string         `json:"status" gorm:"default:'todo'"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`

	// Relationships
	Parent   *Task  `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Subtasks []Task `json:"subtasks,omitempty" gorm:"foreignKey:ParentID"`
	Creator  User   `json:"creator,omitempty" gorm:"foreignKey:CreatorID"`
	Assignee *User  `json:"assignee,omitempty" gorm:"foreignKey:AssigneeID"`
}

const (
	TaskStatusTodo       = "todo"
	TaskStatusInProgress = "in_progress"
	TaskStatusDone       = "done"
	TaskStatusCancelled  = "cancelled"
)

const (
	RoleAdmin = "admin"
	RoleUser  = "user"
)
