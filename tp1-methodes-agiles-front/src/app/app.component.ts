import { Component } from '@angular/core';
import { ReservationFormComponent } from './reservation-form/reservation-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReservationFormComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {}