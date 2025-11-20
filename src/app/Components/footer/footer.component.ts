import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  
  socialLinks = [
    { icon: 'facebook', label: 'Facebook', url: '#' },
    { icon: 'twitter', label: 'Twitter', url: '#' },
    { icon: 'photo_camera', label: 'Instagram', url: '#' },
    { icon: 'pinterest', label: 'Pinterest', url: '#' },
    { icon: 'play_circle', label: 'YouTube', url: '#' }
  ];

  quickLinks = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Services', path: '/services' },
    { name: 'Treatments', path: '/treatments' },
    { name: 'Contact', path: '/contact' }
  ];

  contactInfo = {
    email: 'info@warmsa.com',
    phone: '+1 (555) 123-4567',
    address: '123 Wellness Street, Spa City, SC 12345'
  };
}
