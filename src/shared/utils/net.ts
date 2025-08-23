import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from "axios";

/**
 * RcloneX 网络请求客户端类
 */
class NetworkClient {
  private axiosInstance: AxiosInstance;
  private readonly timeout: number = 10000;

  constructor() {
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }

  /**
   * 创建 axios 实例
   */
  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  /**
   * 设置请求拦截器
   */
  private setupRequestInterceptor(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.setAuthenticationHeaders(config);
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  /**
   * 设置响应拦截器
   */
  private setupResponseInterceptor(): void {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response.data,
      (error) => {
        this.handleResponseError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 设置认证头信息
   */
  private setAuthenticationHeaders(config: AxiosRequestConfig): void {
    const rc = this.getRcloneRC();
    const token = this.getRcloneToken();

    if (!rc || !token) {
      this.redirectToLogin();
      throw new Error("Missing rclone-rc or rclone-token");
    }

    config.baseURL = rc;
    config.headers = config.headers || {};
    config.headers.Authorization = `Basic ${token}`;
  }

  /**
   * 处理响应错误
   */
  private handleResponseError(error: AxiosError): void {
    if (error.response?.status === 401) {
      this.clearAuthData();
      this.redirectToLogin();
    }
  }

  /**
   * 获取 Rclone RC 地址
   */
  private getRcloneRC(): string | null {
    return localStorage.getItem("rclone-rc");
  }

  /**
   * 获取 Rclone Token
   */
  private getRcloneToken(): string | null {
    return localStorage.getItem("rclone-token");
  }

  /**
   * 清除认证数据
   */
  private clearAuthData(): void {
    localStorage.removeItem("rclone-rc");
    localStorage.removeItem("rclone-token");
  }

  /**
   * 跳转到登录页
   */
  private redirectToLogin(): void {
    location.href = "/login";
  }

  /**
   * GET 请求
   */
  async get<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.request({ method: 'GET', ...config }) as Promise<T>;
  }

  /**
   * POST 请求
   */
  async post<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    console.log('post', config)
    return this.axiosInstance.request({ method: 'POST', ...config }) as Promise<T>;
  }

  /**
   * PUT 请求
   */
  async put<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.request({ method: 'PUT', ...config }) as Promise<T>;
  }

  /**
   * DELETE 请求
   */
  async delete<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.request({ method: 'DELETE', ...config }) as Promise<T>;
  }

  /**
   * PATCH 请求
   */
  async patch<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.request({ method: 'PATCH', ...config }) as Promise<T>;
  }

  /**
   * 通用请求方法（直接暴露 request 方法）
   */
  async request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.request(config) as Promise<T>;
  }

  /**
   * 获取原始 axios 实例（用于高级用法）
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// 创建单例实例
const net = new NetworkClient();

export { net, NetworkClient };
