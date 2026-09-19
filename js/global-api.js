// رابط السيرفر المحلي الثابت للموقع
const API_BASE_URL = 'http://localhost:5000/api';

// دالة عامة للتحقق من تسجيل الدخول أو جلب بيانات المستخدم في أي صفحة
async function checkAuthAndGetData() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        if (data.success) {
            console.log("تم جلب بيانات الأعضاء بنجاح من قاعدة البيانات:", data.users);
            return data.users;
        }
    } catch (error) {
        console.error("تعذر الاتصال بالسيرفر المحلي:", error);
    }
}

// دالة تسجيل الخروج المشتركة لكل الصفحات
function logoutUser() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}
