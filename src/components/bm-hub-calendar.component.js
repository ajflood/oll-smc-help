import React, { Component } from "react";
import { Link } from "react-router-dom"
import axios from 'axios';
import update from 'immutability-helper';

import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import "react-big-calendar/lib/css/react-big-calendar.css";

import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import DateTimePicker from 'react-datetime-picker';
import Swal from 'sweetalert2';


import {findUser, checkLogin} from "../api/user"




export default class BMhubList extends Component {
	constructor(props) {
	  
	  super(props)
	  
	  this.mapBlackoutRooms = this.mapBlackoutRooms.bind(this);

	  this.state = {
		events: [],
		pending_events: [],
		loggedIn: false,
		defaultView: "week",
     	defaultDate: "",
	  };
	}
  
	async componentDidMount() {
		if (await checkLogin()){
			this.setState({ loggedIn: true })
		  } else {
			this.setState({ loggedIn: false })
		  }

		var user = await findUser()
		
		url = `http://${process.env.REACT_APP_NODE_IP}:4000/room/find-all/true`
		var rooms_map = await axios.get(url)
		  .then(res => {
			return new Map(res.data.map(i => [i._id, i.name]))
		  })
		  .catch((error) => {
			console.log(error);
		  })

		var all_events = []
		var all_blackouts = []
		for (let room in user.rooms) {
			var room_id = user.rooms[room]
			var url = `http://${process.env.REACT_APP_NODE_IP}:4000/event/find-bm-cal/`
			await axios.get(url + room_id)
			.then(res => {
				var new_events = res.data
				all_events.push(...new_events)
			})
				.catch((error) => {
				console.log(error);
			})
			
			url = `http://${process.env.REACT_APP_NODE_IP}:4000/blackout/find-all`
			await axios.get(url)
				.then(res => {
					var room_blackouts = res.data.filter(item => item.rooms.includes(room_id))
					all_blackouts.push(...room_blackouts)
				})
				.catch((error) => {
					console.log(error);
				});
		}

		var filtered_blackouts = all_blackouts.map(e => e["_id"])
			// store the keys of the unique objects
			.map((e, i, final) => final.indexOf(e) === i && i)
			// eliminate the dead keys & store unique objects
			.filter(e => all_blackouts[e]).map(e => all_blackouts[e]);
			
		this.setState({
			all_events: [...all_events.map(
				({ startTime, endTime, name, room, status, _id, requestor, notes}) => ({
				  start: new Date(startTime),
				  end: new Date(endTime),
				  title: rooms_map.get(room) + ": " + name,
				  status: status,
				  allDay: false,
				  id: _id,
				  requestor: requestor,
				  notes: notes,
				})), 
				...filtered_blackouts.map(
					({ startTime, endTime, name, rooms, status, _id, requestor, notes}) => ({
					  start: new Date(startTime),
					  end: new Date(endTime),
					  title: "ADMIN RESERVED - " + this.mapBlackoutRooms(rooms_map, rooms) + ": " + name,
					  status: "Blackout",
					  allDay: false,
					  requestor: requestor,
					  notes: notes,
				})) ]
		});
	}

	mapBlackoutRooms(map, rooms){		
		return rooms.map( (room) => {
			return map.get(room)
		})
	}
  
	handleChangeView = (view, date) => {
		this.setState({
			defaultView: view
		  })
		// this.GetCalendarEvents()
	  }

	handleOnNavigate = (date) => {
		this.setState({
			defaultDate: date
		  })
		// this.GetCalendarEvents()
	  }

	approveRequest(id) {
		var url = `http://${process.env.REACT_APP_NODE_IP}:4000/event/approve/`
		axios.put(url + id, {status: "Approved"})
		  .then((res) => {
			console.log('Event successfully approved')
		  }).catch((error) => {
			console.log(error)
		  })
	  }

	rejectRequest(id, reason) {
		var url = `http://${process.env.REACT_APP_NODE_IP}:4000/event/reject/`
		axios.put(url + id, {status: "Rejected", reason: reason})
		.then((res) => {
		  console.log('Event successfully rejected')
		}).catch((error) => {
		  console.log(error)
		})
	  }

	swalTrigger = async (event) => {
		if (event.status !== "Blackout") {
			var url = `http://${process.env.REACT_APP_NODE_IP}:4000/users/find-id/`
			var user = await axios.get(url + event.requestor)
			.then(res => {
				return res.data
				})
			.catch((error) => {
				console.log(error);
			})
			var text = `Requestor: ${user.name}<br>Email: ${user.email}<br>Phone: ${user.phone}<br>Requestor notes: ${event.notes}`
		}
		
		if (event.status === "Approved") {
			Swal.fire({
				title: event.title,
				html: text,
				showConfirmButton: false,
				showCancelButton: true,
				cancelButtonText: `Cancel`,
				showDenyButton: false,
			})
		} else if (event.status === "Blackout") {
			Swal.fire({
				title: event.title,
				showConfirmButton: false,
				showCancelButton: true,
				cancelButtonText: `Cancel`,
				showDenyButton: false,
			})
		} else {
			Swal.fire({
				title: event.title,
				html: text,
				showConfirmButton: true,
				confirmButtonText: `Approve`,
				showCancelButton: true,
				cancelButtonText: `Cancel`,
				showDenyButton: true,
				denyButtonText: `Reject`,
			})
			.then((result) => {
				if (result.isConfirmed) {
				Swal.fire({
						title: event.title,
						icon: 'warning',
						html: "Verify event approval",
						showConfirmButton: true,
						confirmButtonText: `Approve`,
						showCancelButton: true,
						cancelButtonText: `Cancel`,
						showDenyButton: false,
						reverseButtons: true,
					})
					.then((result) => {
						if (result.isConfirmed) {
							this.approveRequest(event.id)
							event.status = "Approved"

							const index = this.state.all_events.findIndex((aEvent) => aEvent.id === event.id);
							const updated_all_events = update(this.state.all_events, {$splice: [[index, 1, event]]});
							this.setState({all_events: updated_all_events});
						}
					});
				} else if (result.isDenied) {
					Swal.fire({
						title: event.title,
						icon: 'warning',
						html: "Please provide a reason for the rejection",
						showConfirmButton: true,
						confirmButtonText: `Reject`,
						showCancelButton: true,
						cancelButtonText: `Cancel`,
						showDenyButton: false,
						reverseButtons: true,
						input: "text",
						required: 'true'
					})
					.then((result) => {
						if (result.isConfirmed) {
							this.rejectRequest(event.id, result.value)
							event.status = "Rejected"

							const index = this.state.all_events.findIndex((aEvent) => aEvent.id === event.id);
							const updated_all_events = update(this.state.all_events, {$splice: [[index, 1]]});
							this.setState({all_events: updated_all_events});
						}
					});
				}
			});
		}
	}



	Scheduler() {
		const localizer = momentLocalizer(moment);
		// const DnDCalendar = withDragAndDrop(Calendar);
		


		return <Calendar
				localizer={localizer}
				selectable={false}
				events={this.state.all_events}
				defaultDate={this.state.defaultDate}
				startAccessor="start"
				endAccessor="end"
				defaultView={this.state.defaultView}
				style={{ height: '70vh' }}
				onSelectEvent={this.swalTrigger}
				onNavigate={this.handleOnNavigate}
				onView={this.handleChangeView}
				views={['month', 'week', 'day']}
				eventPropGetter={(event) => ({
					style: {
					backgroundColor: ["Approved", "Blackout"].includes(event.status)  ? '#3174ad' : '#FF0000' ,
					},
				})}
				/>
	  }

	  
  
	render() {
	  let html
	  if (this.state.loggedIn) {
			html = <div> {this.Scheduler()} </div>
		} else {
		  html = <div>
			  <Link to="/login">Login for more functionality</Link>
			</div>
		}
		return (html);
	}
  }