import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Salle, Semestre, Solde, Utilisateur } from './models';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private http = inject(HttpClient);
  private api = 'http://localhost:8080/api';

  utilisateurs() { return this.http.get<Utilisateur[]>(`${this.api}/utilisateurs`); }
  salles()       { return this.http.get<Salle[]>(`${this.api}/salles`); }
  semestres()    { return this.http.get<Semestre[]>(`${this.api}/semestres`); }

  solde(utilisateurId: number, semestreId: number) {
    return this.http.get<Solde>(`${this.api}/solde`, { params: { utilisateurId, semestreId } });
  }

  creer(payload: unknown) {
    return this.http.post(`${this.api}/reservations`, payload);
  }
}