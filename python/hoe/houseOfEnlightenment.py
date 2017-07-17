#!/usr/bin/env python

from __future__ import division
import json
import optparse
import sys
from threading import Thread
from time import sleep


from hoe import opc
from hoe import osc_utils
from hoe import scene_manager


#TODO: remove these
#globalParams = {}
#globalParams["effectCount"] = 5
#globalParams["effectIndex"] = 0

#-------------------------------------------------------------------------------
# command line
def parse_command_line():
    parser = optparse.OptionParser()
    parser.add_option('-l', '--layout', dest='raw_layout', default='../layout/hoeLayout.json',
                        action='store', type='string',
                        help='layout file')
    parser.add_option('-s', '--server', dest='server', default='127.0.0.1:7890',
                        action='store', type='string',
                        help='ip and port of server')
    parser.add_option('-f', '--fps', dest='fps', default=20,
                        action='store', type='int',
                        help='frames per second')

    options, args = parser.parse_args()

    if not options.raw_layout:
        parser.print_help()
        print
        print 'ERROR: you must specify a layout file using --layout or use default (../layout/hoeLayout.json)'
        print
        sys.exit(1)

    options.layout = parse_layout(options.raw_layout)

    return options

#-------------------------------------------------------------------------------



# parse layout file.
# TODO: groups, strips, clients, channels
def parse_layout(layout):

    print
    print '    parsing layout file'
    print

    """
    Old:
    coordinates = []
    for item in json.load(open(layout)):
        if 'point' in item:
            coordinates.append(tuple(item['point']))

    return coordinates
    """

    # Just use a dictionary as loaded
    return json.load(open(layout))

#-------------------------------------------------------------------------------
# connect to OPC server
def start_opc(server):
    client = opc.Client(server)
    if client.can_connect():
        print '    connected to %s' % server
    else:
        # can't connect, but keep running in case the server appears later
        print '    WARNING: could not connect to %s' % server
    print
    return client


def start_scene_manager(osc_server, opc_client, config):
    # OSCServer, Client, dict -> SceneManager, Thread
    mgr = scene_manager.SceneManager(osc_server, opc_client, config.layout, config.fps)
    init_osc_inputs(mgr)
    thread = mgr.serve_in_background()

    return mgr, thread


def init_osc_inputs(mgr):
    # SceneManager -> None
    """
    DEVELOPERS - Add inputs you need for testing. They will be finalized later
    """

    # Good and easy faders for sharing across testing
    mgr.add_fader("r", 50)
    mgr.add_fader("g", 50)
    mgr.add_fader("b", 255)

    # Add some generic buttons
    for i in range(6):
        mgr.add_button("b%s" % i)

    # A fader for example_spatial_stripes.AdjustableFillFromBottom
    mgr.add_fader("bottom_fill", 25)

    print 'Registered OSC Inputs\n'

#-------------------------------------------------------------------------------
def launch():
    config = parse_command_line()
    osc_server = osc_utils.create_osc_server()

    opc = start_opc(config.server)
    scene, scene_thread = start_scene_manager(osc_server, opc, config)
   # scene.start() #run forever

    osc_server.addMsgHandler("/nextScene", scene.next_scene_handler)

    while not scene.is_running:
        sleep(.1)

    from OSC import OSCMessage
    osc_client = osc_utils.get_osc_client()
    keep_running=True
    while keep_running:
        key = raw_input("Send a keyboard command: ")
        if not key:
            continue
        key_lower=key.lower()
        if ("quit" == key_lower):
            #TODO: We should really use atexit for all this. This is a short-term fix to not take down the simulator with us
            print "Received shutdown command. Exiting now"
            scene.shutdown()
            print "Waiting up to 10s for scene thread to shutdown"
            scene_thread.join(10000)
            #osc_server.shutdown()
            #TODO: This was deadlocking!
            print "Skipped OSC Server Shutdown"
            opc.disconnect()
            print "OPC Connector Terminated"
            keep_running=False
        if (key_lower in ["next"]):
            osc_utils.send_simple_message(osc_client, "/nextScene")
        else:
            args=key.split(" ",1)
            if(len(args)==1):
                osc_utils.send_simple_message(osc_client, args[0])
            elif(len(args)==2):
                osc_utils.send_simple_message(osc_client, args[0], args[1])

        sleep(.1)

if __name__=='__main__':
    launch();