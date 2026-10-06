import { User } from '../models/user.js';
import * as authService from '../modules/auth/auth.service.js';

console.log('Testing Auth logic structure...');
// Verify export functions exist
console.log('registerUser defined:', typeof authService.registerUser === 'function');
console.log('loginUser defined:', typeof authService.loginUser === 'function');
console.log('getCurrentUser defined:', typeof authService.getCurrentUser === 'function');
