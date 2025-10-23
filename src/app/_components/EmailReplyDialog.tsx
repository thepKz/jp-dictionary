"use client";

import { useState } from "react";

interface EmailReplyDialogProps {
  open: boolean;
  onClose: () => void;
  feedbackData: {
    _id: string;
    type: string;
    email?: string;
    message: string;
    createdAt: string;
  } | null;
  onSendEmail: (email: string, subject: string, message: string) => void;
}

export default function EmailReplyDialog({ 
  open, 
  onClose, 
  feedbackData, 
  onSendEmail 
}: EmailReplyDialogProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!open || !feedbackData) return null;

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    
    setSending(true);
    try {
      await onSendEmail(feedbackData.email || '', subject, message);
      setSubject("");
      setMessage("");
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-medium">Trả lời góp ý</h3>
          <button 
            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Feedback Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Thông tin góp ý:</h4>
            <div className="text-sm space-y-1">
              <p><strong>Email:</strong> {feedbackData.email}</p>
              <p><strong>Loại:</strong> {feedbackData.type}</p>
              <p><strong>Nội dung:</strong> {feedbackData.message}</p>
            </div>
          </div>

          {/* Email Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tiêu đề email:</label>
              <input 
                className="input w-full" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={`Re: ${feedbackData.type} feedback`}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Nội dung email:</label>
              <textarea 
                className="input w-full h-32 resize-none" 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nhập nội dung trả lời..."
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button 
              className="btn-secondary" 
              onClick={onClose}
              disabled={sending}
            >
              Hủy
            </button>
            <button 
              className="btn-primary" 
              onClick={handleSend}
              disabled={sending || !subject.trim() || !message.trim()}
            >
              {sending ? "Đang gửi..." : "Gửi email"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}