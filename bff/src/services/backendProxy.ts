import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import config from '../config.js';

export interface ProxyResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

class BackendProxy {
  private client: AxiosInstance;
  private aiClient: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.backendUrl,
      timeout: config.timeouts.default,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.aiClient = axios.create({
      baseURL: config.backendUrl,
      timeout: config.timeouts.aiOperations,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for logging
    const requestInterceptor = (reqConfig: AxiosRequestConfig): AxiosRequestConfig => {
      console.log(`[BackendProxy] ${reqConfig.method?.toUpperCase()} ${reqConfig.baseURL}${reqConfig.url}`, {
        params: reqConfig.params,
        hasBody: !!reqConfig.data,
      });
      return reqConfig;
    };

    // Add response interceptor for logging
    const responseInterceptor = (response: AxiosResponse): AxiosResponse => {
      console.log(`[BackendProxy] Response ${response.status} from ${response.config.url}`);
      return response;
    };

    const errorInterceptor = (error: unknown) => {
      if (axios.isAxiosError(error)) {
        console.error(`[BackendProxy] Error ${error.response?.status || 'NETWORK'}: ${error.message}`, {
          url: error.config?.url,
          method: error.config?.method,
        });
      }
      return Promise.reject(error);
    };

    this.client.interceptors.request.use(requestInterceptor as never);
    this.client.interceptors.response.use(responseInterceptor, errorInterceptor);
    this.aiClient.interceptors.request.use(requestInterceptor as never);
    this.aiClient.interceptors.response.use(responseInterceptor, errorInterceptor);
  }

  async get<T = unknown>(path: string, params?: Record<string, unknown>, headers?: Record<string, string>): Promise<ProxyResponse<T>> {
    const response = await this.client.get<T>(path, { params, headers });
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  async post<T = unknown>(path: string, data?: unknown, headers?: Record<string, string>): Promise<ProxyResponse<T>> {
    const response = await this.client.post<T>(path, data, { headers });
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  async put<T = unknown>(path: string, data?: unknown, headers?: Record<string, string>): Promise<ProxyResponse<T>> {
    const response = await this.client.put<T>(path, data, { headers });
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  async patch<T = unknown>(path: string, data?: unknown, headers?: Record<string, string>): Promise<ProxyResponse<T>> {
    const response = await this.client.patch<T>(path, data, { headers });
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  async delete<T = unknown>(path: string, headers?: Record<string, string>): Promise<ProxyResponse<T>> {
    const response = await this.client.delete<T>(path, { headers });
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  // AI operations use longer timeout
  async postAI<T = unknown>(path: string, data?: unknown, headers?: Record<string, string>): Promise<ProxyResponse<T>> {
    const response = await this.aiClient.post<T>(path, data, { headers });
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }
}

export const backendProxy = new BackendProxy();
export default backendProxy;
