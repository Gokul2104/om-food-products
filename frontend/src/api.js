import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api"
});
// Add a request interceptor to append JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}
    , (error) => Promise.reject(error));
// Add a response interceptor to handle 401s
api.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
    }
    return Promise.reject(error);
}
);
export default api;

//# sourceMappingURL=data:application/json;base64,eyJtYXBwaW5ncyI6IkFBQUEsT0FBTyxXQUFXO0FBRWxCLE1BQU0sTUFBTSxNQUFNLE9BQU8sRUFDdkIsU0FBUyw2QkFDVixDQUFDOztBQUdGLElBQUksYUFBYSxRQUFRLEtBQUssV0FBVztDQUN2QyxNQUFNLFFBQVEsYUFBYSxRQUFRLFFBQVE7QUFDM0MsS0FBSSxPQUFPO0FBQ1QsU0FBTyxRQUFRLGdCQUFnQixVQUFVOztBQUUzQyxRQUFPO0lBQ0wsVUFBVSxRQUFRLE9BQU8sTUFBTSxDQUFDOztBQUdwQyxJQUFJLGFBQWEsU0FBUyxLQUN2QixhQUFhLFdBQ2IsVUFBVTtBQUNULEtBQUksTUFBTSxVQUFVLFdBQVcsS0FBSztBQUNsQyxlQUFhLFdBQVcsUUFBUTtBQUNoQyxlQUFhLFdBQVcsT0FBTztBQUMvQixTQUFPLFNBQVMsT0FBTzs7QUFFekIsUUFBTyxRQUFRLE9BQU8sTUFBTTtFQUUvQjtBQUVELGVBQWUiLCJuYW1lcyI6W10sInNvdXJjZXMiOlsiYXBpLmpzIl0sInZlcnNpb24iOjMsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBheGlvcyBmcm9tICdheGlvcyc7XHJcblxyXG5jb25zdCBhcGkgPSBheGlvcy5jcmVhdGUoe1xyXG4gIGJhc2VVUkw6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAvYXBpJywgLy8gZGVmYXVsdCBiYWNrZW5kIFVSTFxyXG59KTtcclxuXHJcbi8vIEFkZCBhIHJlcXVlc3QgaW50ZXJjZXB0b3IgdG8gYXBwZW5kIEpXVCB0b2tlblxyXG5hcGkuaW50ZXJjZXB0b3JzLnJlcXVlc3QudXNlKChjb25maWcpID0+IHtcclxuICBjb25zdCB0b2tlbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd0b2tlbicpO1xyXG4gIGlmICh0b2tlbikge1xyXG4gICAgY29uZmlnLmhlYWRlcnMuQXV0aG9yaXphdGlvbiA9IGBCZWFyZXIgJHt0b2tlbn1gO1xyXG4gIH1cclxuICByZXR1cm4gY29uZmlnO1xyXG59LCAoZXJyb3IpID0+IFByb21pc2UucmVqZWN0KGVycm9yKSk7XHJcblxyXG4vLyBBZGQgYSByZXNwb25zZSBpbnRlcmNlcHRvciB0byBoYW5kbGUgNDAxc1xyXG5hcGkuaW50ZXJjZXB0b3JzLnJlc3BvbnNlLnVzZShcclxuICAocmVzcG9uc2UpID0+IHJlc3BvbnNlLFxyXG4gIChlcnJvcikgPT4ge1xyXG4gICAgaWYgKGVycm9yLnJlc3BvbnNlPy5zdGF0dXMgPT09IDQwMSkge1xyXG4gICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgndG9rZW4nKTtcclxuICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3VzZXInKTtcclxuICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnL2xvZ2luJztcclxuICAgIH1cclxuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnJvcik7XHJcbiAgfVxyXG4pO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgYXBpO1xyXG4iXX0=
