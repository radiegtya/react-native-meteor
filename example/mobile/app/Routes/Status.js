'use strict';

console.disableYellowBox = true;


import React, {
  Component,
  StyleSheet,
  Text,
  View,
  TouchableHighlight
} from 'react-native';

import Meteor, { connectMeteor } from 'react-native-meteor';

import Button from 'react-native-button';


@connectMeteor
export default class Status extends Component {
  getMeteorData() {
    return {
      status: Meteor.status(),
      user: Meteor.user(),
      userId: Meteor.userId(),
      loggingIn: Meteor.loggingIn()
    };
  }
  signin() {
    Meteor.loginWithPassword('User', 'password')
  }
  signout() {
    Meteor.logout();
  }
  render() {
    const { status, user, userId, loggingIn } = this.data;

    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          DDP : {' '}
          {status.connected && 'Connected'}
          {!status.connected && 'Disconnected'}
        </Text>
        <View style={{alignItems: 'center'}}>

        {loggingIn &&
          <Button onPress={this.signin.bind(this)} containerStyle={{padding:10, height:45, overflow:'hidden', borderRadius:4, backgroundColor: 'orange'}}
                     style={{fontSize: 20, color: 'white'}}>
            Logging in ...
          </Button>
        }


          {!loggingIn && !user &&
            <Button onPress={this.signin.bind(this)} containerStyle={{padding:10, height:45, overflow:'hidden', borderRadius:4, backgroundColor: '#00BC8C'}}
                       style={{fontSize: 20, color: 'white'}}>
              Sign in
            </Button>
          }
          {!loggingIn && user &&
            <Button onPress={this.signout.bind(this)} containerStyle={{padding:10, height:45, overflow:'hidden', borderRadius:4, backgroundColor: 'red'}}
                       style={{fontSize: 20, color: 'white'}}>
              Sign out
            </Button>
          }

          {user &&
            <Text style={styles.welcome}>{user.username} / {userId}</Text>
          }
        </View>


      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});
