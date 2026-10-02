import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ReservationView {
  id: number;
  salleId: number;
  salleNom: string;
  utilisateurId: number;
  professeurNom: string;
  semestreId: number;
  dateDebut: string;
  dateFin: string;
  dureeHeures: number;
  matiere?: string;
  motif?: string;
  statut: string;
  dateCreation?: string;
}

interface Salle {
  id: number;
  nom: string;
  capacite: number;
  disponible: boolean;
}

interface AlternativeReservation {
  salleId: number;
  salleNom: string;
  debut: string;
  fin: string;
}

interface ReservationActionResponse {
  reservation: ReservationView;
  alternative?: AlternativeReservation;
  message: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly apiUrl = '/api';

  title = 'Gestion des reservations';
  reservations: ReservationView[] = [];
  filteredReservations: ReservationView[] = [];
  salles: Salle[] = [];
  selectedReservation?: ReservationView;
  lastAlternative?: AlternativeReservation;
  loading = false;
  actionLoading = false;
  message = '';
  messageType: 'success' | 'error' = 'success';
  filters = {
    recherche: '',
    statut: '',
    salleId: ''
  };

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadSalles();
    this.loadReservations();
  }

  loadSalles(): void {
    this.http.get<Salle[]>(`${this.apiUrl}/salles`).subscribe({
      next: salles => this.salles = salles,
      error: () => this.showMessage('Impossible de charger les salles.', 'error')
    });
  }

  loadReservations(): void {
    this.loading = true;
    let params = new HttpParams();
    if (this.filters.statut) {
      params = params.set('statut', this.filters.statut);
    }
    if (this.filters.salleId) {
      params = params.set('salleId', this.filters.salleId);
    }

    this.http.get<ReservationView[]>(`${this.apiUrl}/reservations`, { params }).subscribe({
      next: reservations => {
        this.reservations = reservations;
        this.applyLocalFilters();
        this.selectedReservation = this.filteredReservations.find(r => r.id === this.selectedReservation?.id)
          ?? this.filteredReservations[0];
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.showMessage(this.errorMessage(error), 'error');
      }
    });
  }

  applyLocalFilters(): void {
    const recherche = this.filters.recherche.trim().toLowerCase();
    this.filteredReservations = this.reservations.filter(reservation => {
      if (!recherche) {
        return true;
      }
      return [
        reservation.professeurNom,
        reservation.salleNom,
        reservation.matiere,
        reservation.motif,
        reservation.statut
      ].some(value => value?.toLowerCase().includes(recherche));
    });
  }

  selectReservation(reservation: ReservationView): void {
    this.selectedReservation = reservation;
    this.lastAlternative = undefined;
  }

  acceptReservation(reservation: ReservationView): void {
    this.executeAction(reservation.id, 'accepter');
  }

  rejectReservation(reservation: ReservationView): void {
    this.executeAction(reservation.id, 'refuser');
  }

  canAct(reservation: ReservationView): boolean {
    return reservation.statut === 'EN_ATTENTE';
  }

  statusLabel(statut: string): string {
    const labels: Record<string, string> = {
      EN_ATTENTE: 'En attente',
      CONFIRMEE: 'Confirmee',
      REFUSEE: 'Refusee',
      ANNULEE: 'Annulee'
    };
    return labels[statut] ?? statut;
  }

  statusClass(statut: string): string {
    return `status-${statut.toLowerCase()}`;
  }

  private executeAction(id: number, action: 'accepter' | 'refuser'): void {
    this.actionLoading = true;
    this.http.patch<ReservationActionResponse>(`${this.apiUrl}/reservations/${id}/${action}`, {}).subscribe({
      next: response => {
        this.actionLoading = false;
        this.lastAlternative = response.alternative;
        this.showMessage(response.message, 'success');
        this.loadReservations();
      },
      error: error => {
        this.actionLoading = false;
        this.showMessage(this.errorMessage(error), 'error');
      }
    });
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
  }

  private errorMessage(error: unknown): string {
    const response = error as { error?: { message?: string } };
    return response.error?.message ?? 'Une erreur est survenue.';
  }
}
