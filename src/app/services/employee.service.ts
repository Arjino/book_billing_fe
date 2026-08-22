import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { enviort } from '../../environments/environment';

export interface Employee {
  id: number;
  username: string;
  email: string;
  active: boolean;
}

export interface CreateEmployeeRequest {
  username: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = enviort;

  constructor(private http: HttpClient) {}

  list(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.apiUrl.employeesUrl);
  }

  create(req: CreateEmployeeRequest): Observable<Employee> {
    return this.http.post<Employee>(this.apiUrl.employeesUrl, req);
  }

  deactivate(id: number): Observable<Employee> {
    return this.http.put<Employee>(this.apiUrl.deactivateEmployeeUrl(id), {});
  }

  activate(id: number): Observable<Employee> {
    return this.http.put<Employee>(this.apiUrl.activateEmployeeUrl(id), {});
  }
}
