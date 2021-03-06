import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MapPage } from './map.page';

const routes: Routes = [
  {
    path: '',
    component: MapPage
  },
  {
    path: 'recap',
    loadChildren: () => import('./recap/recap.module').then( m => m.RecapPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MapPageRoutingModule {}
