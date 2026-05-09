const fs = require('fs');

function processFile(path) {
  let content = fs.readFileSync(path, 'utf8');

  // Replace Vietnamese strings with English fallback inline
  const replaces = {
    "Quản lý sự kiện": "{language === 'en' ? 'Manage Events' : 'Quản lý sự kiện'}",
    "Tạo sự kiện": "{language === 'en' ? 'Create Event' : 'Tạo sự kiện'}",
    "Doanh thu theo sự kiện": "{language === 'en' ? 'Revenue by Event' : 'Doanh thu theo sự kiện'}",
    "Từ API tổng quan": "{language === 'en' ? 'From overview API' : 'Từ API tổng quan'}",
    "Lấp đầy sự kiện": "{language === 'en' ? 'Event Occupancy' : 'Lấp đầy sự kiện'}",
    "Tính từ trạng thái ghế": "{language === 'en' ? 'Calculated from seats' : 'Tính từ trạng thái ghế'}",
    "Đơn gần đây": "{language === 'en' ? 'Recent Orders' : 'Đơn gần đây'}",
    "Vé đã bán": "{language === 'en' ? 'Sold Tickets' : 'Vé đã bán'}",
    "Hàng chờ hoạt động": "{language === 'en' ? 'Active Queues' : 'Hàng chờ hoạt động'}",
    "Đang giữ ghế": "{language === 'en' ? 'Held Seats' : 'Đang giữ ghế'}",
    "Tìm theo tên sự kiện hoặc địa điểm": "language === 'en' ? 'Search by name or venue' : 'Tìm theo tên sự kiện hoặc địa điểm'",
    "Tiêu đề và địa điểm không được trống": "language === 'en' ? 'Title and location cannot be empty' : 'Tiêu đề và địa điểm không được trống'",
    "Đã cập nhật sự kiện": "language === 'en' ? 'Event updated' : 'Đã cập nhật sự kiện'",
    "Không thể cập nhật": "language === 'en' ? 'Update failed' : 'Không thể cập nhật'",
    "Xác nhận xóa sự kiện": "language === 'en' ? 'Confirm delete event' : 'Xác nhận xóa sự kiện'",
    "Đã xóa sự kiện": "language === 'en' ? 'Event deleted' : 'Đã xóa sự kiện'",
    "Không thể xóa": "language === 'en' ? 'Delete failed' : 'Không thể xóa'",
    "Tiêu đề": "language === 'en' ? 'Title' : 'Tiêu đề'",
    "Mô tả": "language === 'en' ? 'Description' : 'Mô tả'",
    "Tên sự kiện": "{language === 'en' ? 'Event Name' : 'Tên sự kiện'}",
    "Thời gian": "{language === 'en' ? 'Time' : 'Thời gian'}",
    "Địa điểm": "{language === 'en' ? 'Location' : 'Địa điểm'}",
    "Khu ghế": "{language === 'en' ? 'Zones' : 'Khu ghế'}",
    "Ghế": "{language === 'en' ? 'Seats' : 'Ghế'}",
    "Doanh thu": "{language === 'en' ? 'Revenue' : 'Doanh thu'}",
    "Trạng thái": "{language === 'en' ? 'Status' : 'Trạng thái'}",
    "Thao tác": "{language === 'en' ? 'Action' : 'Thao tác'}",
    "Mở bán đến": "{language === 'en' ? 'Sale until' : 'Mở bán đến'}",
    "Lưu": "language === 'en' ? 'Save' : 'Lưu'",
    "Hủy": "language === 'en' ? 'Cancel' : 'Hủy'",
    "Sửa": "language === 'en' ? 'Edit' : 'Sửa'",
    "Xóa": "language === 'en' ? 'Delete' : 'Xóa'"
  };

  for (const [vn, enCode] of Object.entries(replaces)) {
    // Basic text content (wrapped in tags)
    content = content.replace(new RegExp(`>\\s*${vn}\\s*<`, 'g'), `>${enCode}<`);
    // Basic strings (in quotes) for placeholders or toast messages
    content = content.replace(new RegExp(`'${vn}'`, 'g'), enCode);
    content = content.replace(new RegExp(`"${vn}"`, 'g'), enCode);
  }

  // Also replace some styles that might be causing blurriness/hard readability
  content = content.replace(/style={{ background: '#fff', border: '1px solid #E2E8F0' }}/g, "className=\"bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800\"");
  content = content.replace(/style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A' }}/g, "className=\"min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100\"");
  content = content.replace(/style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}/g, "className=\"bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800\"");
  content = content.replace(/style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}/g, "className=\"bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700\"");

  fs.writeFileSync(path, content, 'utf8');
}

processFile('src/app/pages/admin/AdminEventsPage.tsx');
processFile('src/app/pages/admin/AdminDashboardPage.tsx');
