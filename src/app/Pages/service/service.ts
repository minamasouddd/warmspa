import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ServicesService } from '../../services/services.service';

export interface SpaService {
  id: string;
  name: string;
  description: string;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service.html',
  styleUrls: ['./service.css']
})
export class ServicesComponent implements OnInit, OnDestroy {
  title = 'WARMSPA';
  subtitle = 'Discover our premium spa services designed to rejuvenate your body, mind, and spirit';
  services: SpaService[] = [];
  loading = true;
  activeTab: 'single' | 'packages' | 'gym' = 'single';

  private serviceSubscription?: Subscription;

  constructor(
    private servicesService: ServicesService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.serviceSubscription = this.servicesService.getAllServices().subscribe({
      next: (response) => {
        this.services = response?.data?.products?.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description
        })) || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load services:', err);
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.serviceSubscription) {
      this.serviceSubscription.unsubscribe();
    }
  }

  setTab(tab: 'single' | 'packages' | 'gym'): void {
    if (tab === 'gym') {
      this.router.navigate(['/gym']);
    } else {
      this.activeTab = tab;
    }
  }

  trackByServiceId(index: number, service: SpaService): string {
    return service.id;
  }

  onServiceCardClick(service: SpaService): void {
    console.log(`Selected service: ${service.name}`);
  }

  onServiceCardHover(service: SpaService): void {
    console.log(`Hovering over: ${service.name}`);
  }
}
