import { Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Salle, Semestre, Solde, Utilisateur } from '../models';
import { ReservationService } from '../reservation.service';

@Component({
  selector: 'app-reservation-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './reservation-form.component.html',
  styleUrl: './reservation-form.component.scss'
})
export class ReservationFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ReservationService);

  utilisateurs: Utilisateur[] = [];
  salles: Salle[] = [];
  semestres: Semestre[] = [];
  solde: Solde | null = null;
  erreur = '';
  succes = '';

  form = this.fb.group({
    utilisateurId: [null as number | null, Validators.required],
    semestreId: [null as number | null, Validators.required],
    matiere: ['', Validators.required],
    volumeHoraireTotal: [null as number | null, [Validators.required, Validators.min(2)]],
    commentaire: [''],
    creneaux: this.fb.array([])
  });

  get creneaux() { return this.form.get('creneaux') as FormArray; }
  get heures() { return this.creneaux.length * 2; }

  get avertissement(): string {
    const vol = this.form.getRawValue().volumeHoraireTotal;
    if (this.solde?.volumeTotal != null) {
      return this.heures > this.solde.restant!
        ? `Dépasse le volume restant (${this.solde.restant}h).` : '';
    }
    return vol && this.heures !== vol
      ? `Les créneaux (${this.heures}h) doivent égaler le volume (${vol}h).` : '';
  }

  get peutEnvoyer() {
    return this.form.valid && this.creneaux.length > 0 && !this.avertissement;
  }

  ngOnInit() {
    this.api.utilisateurs().subscribe(d => this.utilisateurs = d);
    this.api.salles().subscribe(d => this.salles = d);
    this.api.semestres().subscribe(d => this.semestres = d);
    this.addCreneau();
  }

  addCreneau() {
    this.creneaux.push(this.fb.group({
      debut: ['', Validators.required],
      salleId: [null as number | null, Validators.required]
    }));
  }

  refreshSolde() {
    const { utilisateurId, semestreId } = this.form.getRawValue();
    if (!utilisateurId || !semestreId) return;
    this.api.solde(utilisateurId, semestreId).subscribe(s => {
      this.solde = s;
      const ctrl = this.form.controls.volumeHoraireTotal;
      if (s.volumeTotal != null) { ctrl.setValue(s.volumeTotal); ctrl.disable(); } // already declared
      else { ctrl.enable(); }
    });
  }

  envoyer() {
    this.erreur = '';
    this.succes = '';
    this.api.creer(this.form.getRawValue()).subscribe({
      next: () => {
        this.succes = 'Réservation enregistrée.';
        this.creneaux.clear();
        this.addCreneau();
        this.refreshSolde();
      },
      error: e => this.erreur = e.error?.message ?? 'Erreur serveur.'
    });
  }
}