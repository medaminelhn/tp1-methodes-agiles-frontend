import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, interval, startWith, switchMap } from 'rxjs';

interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
}

interface Reservation {
  id: number;
  salleId: number;
  utilisateurId: number;
  semestreId: number;
  dateDebut: string;
  dateFin: string;
  motif?: string;
  matiere?: string;
  statut?: string;
  demandeType?: 'ANNULATION' | 'MODIFICATION' | string;
  demandeStatut?: 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE' | string;
  demandeCommentaire?: string;
  demandeSalleId?: number;
  demandeDateDebut?: string;
  demandeMatiere?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly apiUrl = 'http://localhost:8080/api';
  private refreshSubscription?: Subscription;

  utilisateurs: Utilisateur[] = [];
  utilisateurId: number | null = null;
  semestreId: number | null = null;

  reservations: Reservation[] = [];
  selectedReservation: Reservation | null = null;
  loading = false;
  error = '';
  success = '';

  requestMode: 'annulation' | 'modification' | null = null;
  requestCommentaire = '';
  modificationSalleId: number | null = null;
  modificationDate = '';
  modificationTime = '';
  modificationMatiere = '';

  currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadUtilisateurs();
  }

  private startAutoRefresh(): void {
    this.refreshSubscription?.unsubscribe();

    // Keep the calendar synchronized with the backend every 5 seconds.
    this.refreshSubscription = interval(5000)
      .pipe(startWith(0), switchMap(() => this.getCalendarRequest()))
      .subscribe({
        next: reservations => {
          this.reservations = reservations;
          this.syncSelectedReservation();
        },
        error: err => {
          if (!this.reservations.length) {
            this.error = this.readError(err, 'Impossible de contacter le backend.');
          }
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  loadUtilisateurs(): void {
    this.loading = true;
    this.error = '';

    this.http.get<Utilisateur[]>(`${this.apiUrl}/utilisateurs`).subscribe({
      next: utilisateurs => {
        this.utilisateurs = utilisateurs;
        if (!this.utilisateurId && utilisateurs.length) {
          this.utilisateurId = utilisateurs[0].id;
        }
        this.loading = false;
        if (this.utilisateurId) {
          this.loadCalendar();
          this.startAutoRefresh();
        }
      },
      error: err => {
        this.loading = false;
        this.error = this.readError(err, 'Impossible de charger la liste des professeurs.');
      }
    });
  }

  loadCalendar(showLoading = true): void {
    if (!this.utilisateurId) {
      this.error = 'Veuillez sélectionner un professeur.';
      return;
    }

    if (showLoading) this.loading = true;
    this.error = '';
    this.success = '';

    this.getCalendarRequest().subscribe({
      next: reservations => {
        this.reservations = reservations;
        this.loading = false;
        this.syncSelectedReservation();
      },
      error: err => {
        this.loading = false;
        this.error = this.readError(err, 'Impossible de charger le calendrier.');
      }
    });
  }

  get selectedUtilisateur(): Utilisateur | null {
    return this.utilisateurs.find(u => u.id === this.utilisateurId) ?? null;
  }

  professeurLabel(utilisateur: Utilisateur): string {
    return `${utilisateur.prenom} ${utilisateur.nom}`.trim();
  }

  private getCalendarRequest() {
    const params: Record<string, string> = {
      utilisateurId: String(this.utilisateurId)
    };
    if (this.semestreId) params['semestreId'] = String(this.semestreId);
    return this.http.get<Reservation[]>(`${this.apiUrl}/calendrier`, { params });
  }

  openReservation(reservation: Reservation): void {
    this.selectedReservation = reservation;
    this.closeRequestForm();
  }

  closeDetails(): void {
    this.selectedReservation = null;
    this.closeRequestForm();
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
  }

  goToToday(): void {
    const now = new Date();
    this.currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  get monthLabel(): string {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(this.currentMonth);
  }

  get calendarDays(): Date[] {
    const first = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    const last = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);
    const startOffset = (first.getDay() + 6) % 7;
    const totalCells = Math.ceil((startOffset + last.getDate()) / 7) * 7;
    const days: Date[] = [];

    for (let i = 0; i < totalCells; i++) {
      days.push(new Date(first.getFullYear(), first.getMonth(), i - startOffset + 1));
    }
    return days;
  }

  reservationsForDay(day: Date): Reservation[] {
    return this.reservations
      .filter(r => {
        const start = new Date(r.dateDebut);
        return start.getFullYear() === day.getFullYear()
          && start.getMonth() === day.getMonth()
          && start.getDate() === day.getDate();
      })
      .sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime());
  }

  isCurrentMonth(day: Date): boolean {
    return day.getMonth() === this.currentMonth.getMonth() && day.getFullYear() === this.currentMonth.getFullYear();
  }

  isToday(day: Date): boolean {
    const today = new Date();
    return day.toDateString() === today.toDateString();
  }

  formatTime(value?: string): string {
    if (!value) return '--:--';
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  formatDate(value?: string): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
  }

  statusLabel(reservation: Reservation): string {
    if (reservation.demandeStatut === 'EN_ATTENTE') {
      return reservation.demandeType === 'ANNULATION'
        ? 'Annulation en attente'
        : 'Modification en attente';
    }
    return reservation.statut || 'Inconnue';
  }

  startCancellationRequest(): void {
    this.requestMode = 'annulation';
    this.requestCommentaire = '';
    this.error = '';
    this.success = '';
  }

  startModificationRequest(): void {
    if (!this.selectedReservation) return;

    const reservation = this.selectedReservation;
    const date = new Date(reservation.dateDebut);
    this.requestMode = 'modification';
    this.modificationSalleId = reservation.salleId;
    this.modificationDate = this.toDateInputValue(date);
    this.modificationTime = this.toTimeInputValue(date);
    this.modificationMatiere = reservation.matiere || '';
    this.requestCommentaire = '';
    this.error = '';
    this.success = '';
  }

  closeRequestForm(): void {
    this.requestMode = null;
    this.requestCommentaire = '';
    this.modificationSalleId = null;
    this.modificationDate = '';
    this.modificationTime = '';
    this.modificationMatiere = '';
  }

  submitCancellation(): void {
    if (!this.selectedReservation) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    const body = this.requestCommentaire.trim()
      ? { commentaire: this.requestCommentaire.trim() }
      : undefined;

    this.http.post<Reservation>(
      `${this.apiUrl}/reservations/${this.selectedReservation.id}/annulation`,
      body,
      { params: { utilisateurId: String(this.utilisateurId) } }
    ).subscribe({
      next: reservation => {
        this.loading = false;
        this.success = 'La demande d’annulation a été envoyée.';
        this.selectedReservation = reservation;
        this.closeRequestForm();
        this.loadCalendar(false);
      },
      error: err => {
        this.loading = false;
        this.error = this.readError(err, 'La demande d’annulation a échoué.');
      }
    });
  }

  submitModification(): void {
    if (!this.selectedReservation || !this.modificationSalleId || !this.modificationDate || !this.modificationTime) {
      this.error = 'La salle, la date et l’heure sont obligatoires.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const debut = `${this.modificationDate}T${this.modificationTime}:00`;
    const body = {
      salleId: this.modificationSalleId,
      debut,
      matiere: this.modificationMatiere.trim() || null,
      commentaire: this.requestCommentaire.trim() || null
    };

    this.http.post<Reservation>(
      `${this.apiUrl}/reservations/${this.selectedReservation.id}/modification`,
      body,
      { params: { utilisateurId: String(this.utilisateurId) } }
    ).subscribe({
      next: reservation => {
        this.loading = false;
        this.success = 'La demande de modification a été envoyée.';
        this.selectedReservation = reservation;
        this.closeRequestForm();
        this.loadCalendar(false);
      },
      error: err => {
        this.loading = false;
        this.error = this.readError(err, 'La demande de modification a échoué.');
      }
    });
  }

  private syncSelectedReservation(): void {
    if (!this.selectedReservation) return;
    const updated = this.reservations.find(r => r.id === this.selectedReservation!.id);
    if (updated) this.selectedReservation = updated;
  }

  private toDateInputValue(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private toTimeInputValue(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private readError(error: any, fallback: string): string {
    return error?.error?.message || error?.error?.error || error?.message || fallback;
  }
}
