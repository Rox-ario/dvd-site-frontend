import { Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = new Router();
  const token = localStorage.getItem('jwt_token');
  const userRole = localStorage.getItem('user_role');

  if (token && (userRole === 'ADMIN' || userRole === 'ROLE_ADMIN')) {
    return true;
  } else {
    router.navigate(['/auth/login']);
    return false;
  }
};

