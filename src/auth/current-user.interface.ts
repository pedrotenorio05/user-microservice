export interface ICurrentUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'GESTOR' | 'OPERADOR';
  secretary?: string;
}