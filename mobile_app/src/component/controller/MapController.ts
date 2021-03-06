import { Map, tileLayer, marker, icon, circle, Marker, Circle, LatLngExpression, latLng } from 'leaflet';
import { Position } from './../entity/Position';
import { NgElement, WithProperties } from '@angular/elements';
import { ReportComponent } from 'src/app/report/report.component';
import { HttpClient } from '@angular/common/http';
import { ModalController } from '@ionic/angular';
import { RecapPage } from 'src/app/insert/map/recap/recap.page';

export class MapController {

    private map: Map;
    private userPosition: Position;
    private viewPosition: Position;
    private userCircle: Circle;
    private userMarker: Marker;
    private httpClient: HttpClient;
    private places: Array<any> = [];
    private hiddenPlaces: Array<any> = [];
    private showPopup: any = null;
    private defaultZoom: number = 23;

    private static ENDPOINT = "http://localhost:3000";
    private static GEOCODING = "https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1"

    private static USER_MARKER = icon({
        iconUrl: 'assets/icon/man.png',
        iconSize: [40, 40],
        popupAnchor: [0, -20]
    });

    private static GREEN_MARKER = icon({
        iconUrl: 'assets/icon/green_marker.png',
        iconSize: [40, 40],
        popupAnchor: [0, -20],

    });

    private static RED_MARKER = icon({
        iconUrl: 'assets/icon/red_marker.png',
        iconSize: [40, 40],
        popupAnchor: [0, 0]
    });

    private static YELLOW_MARKER = icon({
        iconUrl: 'assets/icon/yellow_marker.png',
        iconSize: [40, 40],
        popupAnchor: [0, 0]
    });

    constructor(div: string, position: Position, viewPosition: Position, httpClient: HttpClient, showPopup: any) {
        this.httpClient = httpClient;
        this.userPosition = position;
        this.viewPosition = viewPosition;
        this.showPopup = showPopup;

        this.map = new Map(div).setView([this.viewPosition.getLatitude(), this.viewPosition.getLongitude()], this.defaultZoom);
        tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);
    }

    destroyMap() {
        if (this.map) {
            this.map.off();
            this.map.remove();
        }
    }

    public addUser() {
        if (this.map) {
            this.userMarker = marker([this.userPosition.getLatitude(), this.userPosition.getLongitude()], { icon: MapController.USER_MARKER })
                .addTo(this.map);
            console.debug("added new marker ", this.userMarker);
            this.userCircle = circle([this.userPosition.getLatitude(), this.userPosition.getLongitude()], 50, {
                color: '#000000',
                fillColor: '#153E7E',
                fillOpacity: 0.5,
                weight: 0.5
            }).addTo(this.map);
        }

    }

    public getPositions(university: string) {
        this.httpClient.post(MapController.ENDPOINT + "/positions", { position: this.userPosition, university: university }).subscribe(
            res => {
                /** server returns a list of places */
                console.log("positions %o", res);
                Array.isArray(res) && res.forEach(place => {
                    this.reverseGeocoding(place.position.lat, place.position.lon, null, null).subscribe((res:any) => {
                        let street = "";
                        if(res && res.address){
                            street = this.getStreet(res.address);
                        }
                        let posMarker = marker(place.position, { icon: place.status == 0 ? MapController.RED_MARKER : (place.status == 1 ? MapController.GREEN_MARKER : MapController.YELLOW_MARKER) })
                            .bindTooltip(place.name,
                                {
                                    permanent: true,
                                    direction: 'center',
                                    offset: [-5, -20],
                                    className: "leaflet-tooltip"  // you can found it at global.scss
                                },
                            )
                            .bindPopup(
                                this.createPlacePopup(place.id, place.name, place.type, university, place.building, place.description || "", place.status, street, place.position, place.people || null, place.time || null, place.news ? place.news.length : 0, place.ts || null)
                                , { autoClose: true })
                            .on('click', (evt) => {
                                let popup = this.createPlacePopup(place.id, place.name, place.type, university, place.building, place.dezcription || "", place.status, street, null, place.people || null, place.time || null, place.news ? place.news.length : 0, place.ts || null);
                                popup.isNear = this.isNear(place.position);
                                evt.target.bindPopup(popup, { autoClose: true });
                                place.position.lat > this.userPosition.getLatitude() && this.map.setView([place.position.lat + 0.001, place.position.lon], this.defaultZoom, { animate: true });
                            })
                            .on('popupclose', () => {
                                console.log("popup closed.");
                                place.position.lat > this.userPosition.getLatitude() && this.map.setView([this.userPosition.getLatitude(), this.userPosition.getLongitude()], this.defaultZoom, { animate: true });
                            })
                            .addTo(this.map);

                        if (this.showPopup && this.showPopup == place.id) {
                            console.log("opening");
                            place.position.lat > this.userPosition.getLatitude() && this.map.setView([place.position.lat + 0.005, place.position.lon], this.defaultZoom, { animate: true });
                            posMarker.openPopup();
                        }
                        this.places.push({ marker: posMarker, status: place.status });
                    })
                })
            }
        )
    }

    public getBuildings(modalController: ModalController, university) {
        this.httpClient.post(MapController.ENDPOINT + "/positions", { position: this.userPosition, university: university }).subscribe(
            res => {
                /** server returns a list of places */
                console.log("positions %o", res);
                Array.isArray(res) && res.forEach(place => {
                    marker(place.position, { icon: place.status == 0 ? MapController.RED_MARKER : (place.status == 1 ? MapController.GREEN_MARKER : MapController.YELLOW_MARKER)})
                        .on('dblclick', (evt) => {
                            this.reverseGeocoding(place.position.lat, place.position.lon, modalController, place);
                        })
                        .addTo(this.map);
                });
                this.map.on('dblclick', (evt: any) => {
                    this.reverseGeocoding(evt.latlng.lat, evt.latlng.lng, modalController, null);
                })
            }
        )
    }

    public isNear(point: any): boolean {
        let radius = this.userCircle.getRadius(); //in meters
        let circleCenterPoint = this.userCircle.getLatLng(); //gets the circle's center latlng
        return Math.abs(circleCenterPoint.distanceTo(point)) <= radius;
    }

    createPlacePopup(id: number, name: string, type: string, university: string, building: string, description: string, status: number, street: string, pos: any, people: string, time: string, newsCount: number, ts: number) {
        let popupEl: NgElement & WithProperties<ReportComponent> = document.createElement('popup-element') as any;
        popupEl.identifier = id;
        popupEl.name = name;
        popupEl.type = type;
        popupEl.status = status;
        popupEl.building = building;
        popupEl.description = description;
        popupEl.university = university;

        if (status == 1) {
            popupEl.persons = people;
            popupEl.time = time;
            popupEl.ts = ts;
        }
        popupEl.street = street;
        popupEl.hasNews = newsCount > 0;
        if (pos) {
            popupEl.isNear = this.isNear(pos);
        }
        return popupEl;
    }

    reverseGeocoding(lat: number, long: number, modalController: ModalController, place: any) {
        let url = MapController.GEOCODING.replace("{lat}", lat.toString()).replace("{lon}", long.toString());
        modalController && this.httpClient.get(url).subscribe((res: any) => {
            if (res && res.address) {
                let street = this.getStreet(res.address);
                modalController && this.presentModal(modalController, place, {lon: long, lat: lat}, street);
            }
        });

        if (!modalController) {
            return this.httpClient.get(url);
        }

    }

    getStreet(address: any){
        return address.road + " " + (address.house_number || "") + ", " + address.town + " (" + address.country_code.toUpperCase() + ")";
    }

    async presentModal(modalController: ModalController, place: any, position: any, street: string) {
        const modal = await modalController.create({
            component: RecapPage,
            componentProps: {
                "place": place,
                "street": street,
                "position": position
            }
        });
        return await modal.present();
    }

    changeQueues(openQueues: boolean) {
        if (openQueues) {
            this.places.forEach(place => {
                let markerToHide: Marker = place.marker;
                if (place.status != 1) {
                    markerToHide.remove();
                    this.hiddenPlaces.push(markerToHide);
                }
            })
        }
        else {
            this.hiddenPlaces.forEach((place: Marker) => {
                place.addTo(this.map);
            })
            this.hiddenPlaces = [];
        }
    }

    resetView() {
        this.map.setView([this.userPosition.getLatitude(), this.userPosition.getLongitude()], this.defaultZoom, { animate: true });
    }


}
