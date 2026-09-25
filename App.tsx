/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StudentList } from './components/StudentList';
import { StudentModal } from './components/StudentModal';
import { StudentDetailModal } from './components/StudentDetailModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ApiDocumentationView } from './components/ApiDocumentationView';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import {
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
} from './api/studentApi';
import { Student, StudentFormData } from './types/student';

type AppTab = 'students' | 'docs';

function getTabFromUrl(): AppTab {
  return window.location.hash === '#docs' ? 'docs' : 'students';
}

export default function App() {
  // Navigation tab: 'students' list or 'docs'
  const [activeTab, setActiveTab] = useState<AppTab>(getTabFromUrl);

  // Core Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);

  // Modals & Active Selections
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (
    type: 'success' | 'error' | 'info',
    title: string,
    message: string,
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const navigateToTab = (tab: AppTab) => {
    if (tab === activeTab) return;

    window.history.pushState(null, '', tab === 'docs' ? '#docs' : '#students');
    setActiveTab(tab);
  };

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#students');
    }

    const handleBrowserNavigation = () => {
      setActiveTab(getTabFromUrl());
    };

    window.addEventListener('popstate', handleBrowserNavigation);
    window.addEventListener('hashchange', handleBrowserNavigation);

    return () => {
      window.removeEventListener('popstate', handleBrowserNavigation);
      window.removeEventListener('hashchange', handleBrowserNavigation);
    };
  }, []);

  // Check health and connectivity with backend running on port 3000
  const checkBackendHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setServerConnected(true);
      } else {
        setServerConnected(false);
      }
    } catch {
      setServerConnected(false);
    }
  }, []);

  // 1. READ ALL STUDENTS: fetch list from backend
  const loadStudents = useCallback(async (isSilentRefresh = false) => {
    if (!isSilentRefresh) setIsLoading(true);
    setIsRefreshing(true);
    setError(null);

    try {
      const data = await getAllStudents();
      setStudents(data);
      setServerConnected(true);
    } catch (err: any) {
      console.error('Error fetching students:', err);
      setError(err?.message || 'Failed to connect to API backend at localhost:3000');
      setServerConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    checkBackendHealth();
    loadStudents();
  }, [loadStudents, checkBackendHealth]);

  // 2. CREATE (POST /api/students) or UPDATE (PUT /api/students/:id)
  const handleFormSubmit = async (formData: StudentFormData) => {
    setIsSubmitting(true);
    try {
      if (studentToEdit) {
        // UPDATE (PUT)
        const updated = await updateStudent(studentToEdit.id, formData);
        setStudents((prev) =>
          prev.map((s) => (s.id === studentToEdit.id ? updated : s)),
        );
        addToast(
          'success',
          'Student Updated',
          `PUT /api/students/${studentToEdit.id} succeeded for ${updated.name}`,
        );
      } else {
        // CREATE (POST)
        const created = await createStudent(formData);
        setStudents((prev) => [created, ...prev]);
        addToast(
          'success',
          'Student Created',
          `POST /api/students succeeded for ${created.name}`,
        );
      }

      setIsFormModalOpen(false);
      setStudentToEdit(null);
    } catch (err: any) {
      console.error('Form submission failed:', err);
      addToast(
        'error',
        'Operation Failed',
        err?.message || 'Unable to save student data',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. DELETE (DELETE /api/students/:id)
  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;

    setIsDeleting(true);
    try {
      await deleteStudent(studentToDelete.id);
      setStudents((prev) => prev.filter((s) => s.id !== studentToDelete.id));
      addToast(
        'success',
        'Student Deleted',
        `DELETE /api/students/${studentToDelete.id} successfully removed record`,
      );
      setStudentToDelete(null);
    } catch (err: any) {
      console.error('Delete failed:', err);
      addToast(
        'error',
        'Delete Failed',
        err?.message || 'Unable to delete student record',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Modal Open Handlers
  const openAddModal = () => {
    setStudentToEdit(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setStudentToEdit(student);
    setIsFormModalOpen(true);
  };

  const openViewModal = (student: Student) => {
    setDetailStudentId(student.id);
  };

  const openDeleteModal = (student: Student) => {
    setStudentToDelete(student);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        onAddStudent={openAddModal}
        onRefresh={() => loadStudents(true)}
        isRefreshing={isRefreshing}
        serverConnected={serverConnected}
        totalStudents={students.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'students' ? (
          <StudentList
            students={students}
            isLoading={isLoading}
            error={error}
            onRetry={() => loadStudents(false)}
            onViewStudent={openViewModal}
            onEditStudent={openEditModal}
            onDeleteStudent={openDeleteModal}
            onAddStudent={openAddModal}
          />
        ) : (
          <ApiDocumentationView
            students={students}
            onBack={() => navigateToTab('students')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            Student Management REST API Frontend • React Hooks & Functional Architecture
          </p>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>GET /api/students</span>
            <span>•</span>
            <span>GET /:id</span>
            <span>•</span>
            <span>POST</span>
            <span>•</span>
            <span>PUT /:id</span>
            <span>•</span>
            <span>DELETE /:id</span>
          </div>
        </div>
      </footer>

      {/* Add / Edit Student Modal */}
      <StudentModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setStudentToEdit(null);
        }}
        onSubmit={handleFormSubmit}
        studentToEdit={studentToEdit}
        isSubmitting={isSubmitting}
      />

      {/* Student Details Modal (GET /api/students/:id) */}
      <StudentDetailModal
        studentId={detailStudentId}
        onClose={() => setDetailStudentId(null)}
        onEdit={(student) => {
          setDetailStudentId(null);
          openEditModal(student);
        }}
        onDelete={(student) => {
          setDetailStudentId(null);
          openDeleteModal(student);
        }}
      />

      {/* Delete Confirmation Modal (DELETE /api/students/:id) */}
      <DeleteConfirmModal
        isOpen={Boolean(studentToDelete)}
        student={studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* Notification Toasts */}
      <NotificationToast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
