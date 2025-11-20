import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BranchesService } from '../../services/branches.service';

interface Branch {
  name: string;
  address: string;
  phone: string;
}

interface Governorate {
  name: string;
  branches: Branch[];
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

  constructor(private branchesService: BranchesService) {}

  ngOnInit(): void {
    this.branchesService.getAllBranches().subscribe({
      next: (res: any) => {
        if (res?.data?.branches) {
          this.governorates = res.data.branches.map((city: any) => ({
            name: city.name,
            branches: city.branches.map((b: any) => ({
              name: b.name,
              address: b.address,
              phone: b.phone
            }))
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
}
