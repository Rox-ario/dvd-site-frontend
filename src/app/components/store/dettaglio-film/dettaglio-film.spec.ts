import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DettaglioFilm } from './dettaglio-film';

describe('DettaglioFilm', () => {
  let component: DettaglioFilm;
  let fixture: ComponentFixture<DettaglioFilm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DettaglioFilm],
    }).compileComponents();

    fixture = TestBed.createComponent(DettaglioFilm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
