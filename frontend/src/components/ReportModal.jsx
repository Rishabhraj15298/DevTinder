import React, { useState } from 'react'
import { useTheme } from '../utils/ThemeContext'
import axios from 'axios'
import { BASE_URL } from '../utils/constants'

const ReportModal = ({ isOpen, onClose, reportedUserId, reportedUserName }) => {
  const { isDark, bg, text, border, button } = useTheme()
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const reportReasons = [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'inappropriate_content', label: 'Inappropriate Content' },
    { value: 'fake_profile', label: 'Fake Profile' },
    { value: 'scam', label: 'Scam' },
    { value: 'other', label: 'Other' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!reason) {
      setError('Please select a reason for reporting')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await axios.post(
        `${BASE_URL}/user/report/${reportedUserId}`,
        {
          reason,
          description: description.trim() || undefined,
        },
        { withCredentials: true }
      )

      setSuccess(response.data.message || 'User reported successfully. Our team will review the report.')
      
      // Reset form
      setReason('')
      setDescription('')
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose()
        setSuccess('')
      }, 2000)
    } catch (err) {
      console.error('Error reporting user:', err)
      setError(err.response?.data?.error || 'Failed to report user. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setReason('')
      setDescription('')
      setError('')
      setSuccess('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${bg.secondary} rounded-xl shadow-2xl max-w-md w-full ${border.primary} border`}>
        {/* Header */}
        <div className={`${border.primary} border-b p-6`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-2xl font-bold ${text.primary}`}>Report User</h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className={`p-2 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-full transition-colors disabled:opacity-50`}
            >
              <svg className={`w-6 h-6 ${text.primary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {reportedUserName && (
            <p className={`mt-2 ${text.secondary} text-sm`}>
              Reporting: <span className="font-semibold">{reportedUserName}</span>
            </p>
          )}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className={`p-4 ${isDark ? 'bg-red-500/10' : 'bg-red-100'} border-l-4 border-red-500 ${isDark ? 'text-red-400' : 'text-red-700'} rounded-lg`}>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className={`p-4 ${isDark ? 'bg-green-500/10' : 'bg-green-100'} border-l-4 border-green-500 ${isDark ? 'text-green-400' : 'text-green-700'} rounded-lg`}>
              <span className="font-medium">{success}</span>
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className={`block text-sm font-semibold ${text.primary} mb-3`}>
              Reason for Reporting <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {reportReasons.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    reason === r.value
                      ? isDark
                        ? 'bg-pink-500/20 border-2 border-pink-500'
                        : 'bg-pink-100 border-2 border-pink-500'
                      : `${bg.input} ${border.secondary} border hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'}`
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="mr-3 w-4 h-4 text-pink-500 focus:ring-pink-500"
                    disabled={loading}
                  />
                  <span className={`${text.primary} font-medium`}>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-semibold ${text.primary} mb-2`}>
              Additional Details (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide more details about the issue..."
              className={`w-full px-4 py-3 ${bg.input} ${text.primary} ${border.secondary} border-2 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none resize-none placeholder-gray-400`}
              rows="4"
              maxLength={1000}
              disabled={loading}
            />
            <p className={`mt-1 text-xs ${text.muted}`}>
              {description.length}/1000 characters
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className={`flex-1 px-6 py-3 ${button.secondary} rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason}
              className={`flex-1 px-6 py-3 ${button.danger} rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ReportModal

