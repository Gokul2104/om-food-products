/**
 * Formats a date string to IST (Indian Standard Time)
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
export const formatDateIST = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Formats a date string to IST (Indian Standard Time) with time
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date and time
 */
export const formatDateTimeIST = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

/**
 * Formats a date string to IST (Indian Standard Time) time only
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted time
 */
export const formatTimeIST = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};
