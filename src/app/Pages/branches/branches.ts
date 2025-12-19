import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BranchesService } from '../../services/branches.service';

interface BranchData {
  _id: string;
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  country: string;
  fullAddress: string;
  isActive: boolean;
  workingHours: {
    [key: string]: string;
  };
  spaRooms: number;
  target: number;
  selectedDay?: string;
}

interface Governorate {
  name: string;
  branches: BranchData[];
}

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './branches.html',
  styleUrls: ['./branches.css']
})
export class BranchesComponent implements OnInit {
  governorates: Governorate[] = [];
  loading = true;
  error = '';
  days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  constructor(private branchesService: BranchesService) {}

  ngOnInit(): void {
    this.branchesService.getAllBranches().subscribe({
      next: (res: any) => {
        if (res?.data?.branches && Array.isArray(res.data.branches)) {
          // Group branches by state (governorate)
          const groupedByState = new Map<string, BranchData[]>();
          
          res.data.branches.forEach((branch: BranchData) => {
            const state = branch.state || 'Unknown';
            if (!groupedByState.has(state)) {
              groupedByState.set(state, []);
            }
            branch.selectedDay = 'monday';
            groupedByState.get(state)!.push(branch);
          });

          // Convert map to array of governorates
          this.governorates = Array.from(groupedByState.entries()).map(([state, branches]) => ({
            name: state,
            branches: branches
          }));
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('API error:', err);
        this.error = 'Failed to load branches. Please try again later.';
        this.loading = false;
      }
    });
  }

  onDayChange(branch: BranchData, day: string): void {
    branch.selectedDay = day;
  }
}
