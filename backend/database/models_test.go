package database

import "testing"

func TestTaskStatusConstants(t *testing.T) {
	if TaskStatusTodo != "todo" {
		t.Errorf("Expected 'todo', got %s", TaskStatusTodo)
	}
	if TaskStatusInProgress != "in_progress" {
		t.Errorf("Expected 'in_progress', got %s", TaskStatusInProgress)
	}
	if TaskStatusDone != "done" {
		t.Errorf("Expected 'done', got %s", TaskStatusDone)
	}
	if TaskStatusCancelled != "cancelled" {
		t.Errorf("Expected 'cancelled', got %s", TaskStatusCancelled)
	}
}

func TestRoleConstants(t *testing.T) {
	if RoleAdmin != "admin" {
		t.Errorf("Expected 'admin', got %s", RoleAdmin)
	}
	if RoleUser != "user" {
		t.Errorf("Expected 'user', got %s", RoleUser)
	}
}
