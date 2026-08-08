import axios from "axios";

const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS);
const requestTimeout = Number.isFinite(configuredTimeout) && configuredTimeout > 0
  ? Math.min(60000, Math.max(5000, configuredTimeout))
  : (import.meta.env.PROD ? 45000 : 12000);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: requestTimeout
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("blogverse_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const isGet = String(config.method || "").toLowerCase() === "get";
    const isNetworkFailure = !error.response || error.code === "ECONNABORTED" || error.code === "ERR_NETWORK";
    const canRetry = isGet && isNetworkFailure && !config.skipRetry && (config.__retryCount || 0) < 1;

    if (canRetry) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
      return api(config);
    }

    const responseData = error.response?.data || {};
    const backendUnavailableMessage = import.meta.env.PROD
      ? "BlogVerse backend is temporarily unavailable. If this is the first request after inactivity, it may be starting up. Please try again."
      : "Backend is unavailable. Make sure npm run dev is running in the backend folder.";
    const message = responseData.message
      || (error.code === "ECONNABORTED" ? "The server took too long to respond. Please retry." : "")
      || (error.code === "ERR_NETWORK" ? backendUnavailableMessage : "")
      || error.message
      || "Something went wrong.";

    const normalizedError = new Error(message);
    normalizedError.status = error.response?.status;
    normalizedError.code = responseData.code || error.code;
    normalizedError.responseData = responseData;
    normalizedError.name = error.name;

    if (["ACCOUNT_DISABLED", "ACCOUNT_PENDING_DELETION"].includes(responseData.code)
      && !String(config.url || "").includes("/auth/login")) {
      window.dispatchEvent(new CustomEvent("blogverse:account-status", {
        detail: { code: responseData.code, message }
      }));
    }

    return Promise.reject(normalizedError);
  }
);

export default api;
