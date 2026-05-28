import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { BookingManagementComponent } from './booking-management/booking-management.component';
import { HallManagementComponent } from './hall-management/hall-management.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'login'
	},
	{
		path: 'login',
		component: LoginComponent
	},
	{
		path: 'dashboard',
		component: DashboardComponent,
		canActivate: [authGuard]
	},
	{
		path: 'bookings',
		component: BookingManagementComponent,
		canActivate: [authGuard]
	},
	{
		path: 'halls',
		component: HallManagementComponent,
		canActivate: [authGuard]
	},
	{
		path: '**',
		redirectTo: 'login'
	}
];
