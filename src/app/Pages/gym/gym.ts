import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface Trainer {
  name: string;
  specialty: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-gym',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gym.html',
  styleUrls: ['./gym.css']
})
export class GymComponent implements OnInit {
  
  features: Feature[] = [
    {
      icon: 'fa-dumbbell',
      title: 'Modern Equipment',
      description: 'State-of-the-art fitness machines and free weights for all training levels'
    },
    {
      icon: 'fa-user-shield',
      title: 'Professional Coaches',
      description: 'Certified personal trainers with years of experience in fitness and wellness'
    },
    {
      icon: 'fa-heartbeat',
      title: 'Rehabilitation Programs',
      description: 'Specialized physical therapy and injury recovery programs'
    },
    {
      icon: 'fa-clipboard-list',
      title: 'Personalized Plans',
      description: 'Custom training programs tailored to your goals and fitness level'
    },
    {
      icon: 'fa-wind',
      title: 'Comfortable Atmosphere',
      description: 'Clean, spacious, and well-ventilated environment for optimal training'
    },
    {
      icon: 'fa-clock',
      title: 'Flexible Hours',
      description: 'Extended operating hours to fit your busy schedule'
    }
  ];

  trainers: Trainer[] = [
    {
      name: 'Personal Training',
      specialty: 'Certified Personal Trainers',
      description: 'Our expert trainers create customized workout plans to help you achieve your fitness goals, whether it\'s weight loss, muscle building, or overall wellness.',
      icon: 'fa-user-tie'
    },
    {
      name: 'Rehabilitation & Physical Therapy',
      specialty: 'Specialized Rehabilitation Trainers',
      description: 'Professional support for injury recovery, post-surgery rehabilitation, and chronic pain management with safe, effective training programs.',
      icon: 'fa-hand-holding-medical'
    },
    {
      name: 'Sports Performance',
      specialty: 'Athletic Performance Coaches',
      description: 'Advanced training programs for athletes looking to enhance their performance, speed, agility, and strength.',
      icon: 'fa-running'
    }
  ];

  gymTypes = [
    {
      icon: 'fa-dumbbell',
      title: 'Strength Training',
      description: 'Build muscle and increase power with our comprehensive strength training equipment'
    },
    {
      icon: 'fa-heartbeat',
      title: 'Cardio',
      description: 'Improve cardiovascular health with treadmills, bikes, and rowing machines'
    },
    {
      icon: 'fa-running',
      title: 'Functional Training',
      description: 'Enhance daily movement patterns and overall body functionality'
    }
  ];

  ngOnInit(): void {
    // Scroll to top on component load
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
