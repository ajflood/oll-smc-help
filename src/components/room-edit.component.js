import React, { Component} from "react";
import { Link } from "react-router-dom"
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button';
import axios from 'axios';

import {checkLogin} from "../api/user"

export default class EditRoom extends Component {
  
  constructor(props) {
    super(props)

    this.onChangeName = this.onChangeName.bind(this);
    this.onChangeBuilding = this.onChangeBuilding.bind(this);
    this.onChangeOccupancy = this.onChangeOccupancy.bind(this);
    this.onChangeCalendarID = this.onChangeCalendarID.bind(this);
    this.onChangeEmpMin = this.onChangeEmpMin.bind(this);
    this.onSubmit = this.onSubmit.bind(this);

    // State
    this.state = {    
      name: '',
      building: '',
      occupancy: '',
      calendar_id: '',
      loggedIn: false,
      emp_min: false,
    }
  }

  async componentDidMount() {
    if (await checkLogin()){
      this.setState({ loggedIn: true })
    } else {
      this.setState({ loggedIn: false })
    }

    var url = `http://${process.env.REACT_APP_NODE_IP}:4000/room/find-id/`
    axios.get(url + this.props.match.params.id)
      .then(res => {
        this.setState({
          name: res.data.name,
          building: res.data.building,
          occupancy: res.data.occupancy,
          calendar_id: res.data.calendar_id,
          emp_min: res.data.emp_min,
        });
      })
      .catch((error) => {
        console.log(error);
      })
  }

  onChangeName(e) { this.setState({ name: e.target.value }) }
  onChangeBuilding(e) { this.setState({ building: e.target.value }) }
  onChangeOccupancy(e) { this.setState({ occupancy: e.target.value }) }
  onChangeCalendarID(e) { this.setState({ calendar_id: e.target.value }) }
  onChangeEmpMin(e) { this.setState(({ emp_min }) => ({ emp_min: !emp_min })) }

  onSubmit(e) {
    e.preventDefault()
    
    const RoomObject = {
      name: this.state.name,
      building: this.state.building,
      occupancy: this.state.occupancy,
      calendar_id: this.state.calendar_id,
      emp_min: this.state.emp_min,
    };
    
    var url = `http://${process.env.REACT_APP_NODE_IP}:4000/room/update/`
    axios.put(url + this.props.match.params.id, RoomObject)
      .then((res) => {
        console.log('Room successfully updated')
      }).catch((error) => {
        console.log(error)
      })
 
    this.props.history.push('/room-list')
  }


  render() {
    let html
    if (this.state.loggedIn) {
      html = <div className="form-wrapper">
        <Form onSubmit={this.onSubmit}>
          <Form.Group controlId="Name">
            <Form.Label>Name</Form.Label>
            <Form.Control type="text" value={this.state.name} onChange={this.onChangeName} />
          </Form.Group>

          <Form.Group controlId="Building">
            <Form.Label>Building</Form.Label>
            <Form.Control type="text" value={this.state.building} onChange={this.onChangeBuilding} />
          </Form.Group>

          <Form.Group controlId="Occupancy">
            <Form.Label>Occupancy</Form.Label>
            <Form.Control type="text" value={this.state.occupancy} onChange={this.onChangeOccupancy} />
          </Form.Group>

          <Form.Check 
            type="switch"
            id="Emp_Min"
            label="Employee/Ministry Use only"
            checked={this.state.emp_min}
            onChange={this.onChangeEmpMin}
          />

          <Form.Group controlId="CalendarID">
            <Form.Label>Google Calendar ID</Form.Label>
            <Form.Control type="text" value={this.state.calendar_id} onChange={this.onChangeCalendarID} />
          </Form.Group>

          <Button variant="danger" size="lg" block="block" type="submit">
            Update Room
          </Button>
        </Form>
      </div>
    } else {
        html = <div>
        <Link to="/login">Login for more functionality</Link>
      </div>
    }
    return (html);
  }
}