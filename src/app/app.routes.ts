import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { HallSaveComponent } from './hall-save/hall-save.component';
import { HallListComponent } from './hall-list/hall-list.component';
import { BookingSaveComponent } from './booking-save/booking-save.component';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
	{
		path: '',
		component: LoginComponent
	},
	{
		path: 'dashboard',
		component: DashboardComponent
	},
	{
		path: 'hall-save',
		component: HallSaveComponent
	},
	{
		path: 'hall-list',
		component: HallListComponent
	},
	{
		path: 'booking-save',
		component: BookingSaveComponent
	},
	{
		path: '**',
		redirectTo: ''
	}
];
