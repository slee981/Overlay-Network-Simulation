"use strict";

///////////////////////////////////////////////////
// Variables
///////////////////////////////////////////////////
let regularNodes;
let superNodes;

var cy = cytoscape({
  container: document.getElementById('cy'),

  style: cytoscape.stylesheet()
    .selector('node')
      .style({
        'background-color': function(ele) {
          return ele.data('bg');
        },
        content: 'data(id)'
      }),

  zoom: 1,
  minZoom: 0.1,
  maxZoom:10,
  zoomingEnabled: true,

  elements: []
});

var layoutOptions = {
  name: 'concentric',

  concentric: function(node) {
    return node.degree();
  },
  levelWidth: function(nodes) {
    return nodes.maxDegree() / 4;
  },

  animate: true
};

///////////////////////////////////////////////////
// Functions
///////////////////////////////////////////////////

function displayGraph(layoutOptions) {
  cy.layout(layoutOptions).run();
}

/* MAKE GRAPH COMPONENTS */

function makeRegularNodes(nodes) {
  // make nodes
  for (var i=0; i<nodes; i++) {

    cy.add({
      data: {
        id: 'n' + i,
        bg: 'black',
        h: 20,
        w: 20
      },
      nodeType: 'regularNode',
      group: 'nodes'
    });
  }
}

function makeSuperNodes(nodes) {
  // make nodes
  for (var i=0; i<nodes; i++) {

    cy.add({
      data: {
        id: 's' + i,
        bg: 'blue',
        h: 40,
        w: 40
      },
      nodeType: 'supernode',
      group: 'nodes'
    });
  }
}

function makeEdges(regularNodes, superNodes) {

  var totalNodes = regularNodes + superNodes;
  var regularNodeConnections = totalNodes / 4;
  var superNodeConnections = totalNodes;

  // make edges for supernode to supernode
  for (var i=0; i<superNodes; i++) {
    for (var j=0; j<superNodes; j++) {
      if (i != j) {
        cy.add({
          data: {
            id: 'edges' + i + 's' + j,
            source: 's' + i,
            target: 's' + j
          },
          group: 'edges'
        });
      }
    }
  }

  // make edges for regular nodes to supernodes
  var nodesPerSupernode = Math.floor(regularNodes / superNodes);
  var nodeCounter = 0;
  for (var i=0; i<superNodes; i++) {
    for (var j=0; j<nodesPerSupernode; j++) {
      cy.add({
        data: {
          id: 'edges' + i + 'n' + nodeCounter,
          source: 's' + i,
          target: 'n' + nodeCounter
        },
        group: 'edges'
      });
      nodeCounter += 1;
    }

    // connect any remaining peers to the last super peer
    if (i == superNodes - 1) {
      while (nodeCounter < regularNodes) {
        cy.add({
          data: {
            id: 'edges' + i + 'n' + nodeCounter,
            source: 's' + i,
            target: 'n' + nodeCounter
          },
          group: 'edges'
        });
        nodeCounter += 1;
      }
    }
  }

  // make some edges for regular to regular
  // these should be "random" and connect each peer to ~25% of other peers
  var randomPeerConnections = regularNodes / 20;
  for (var i=0; i<regularNodes; i++) {
    var connections = 0;
    while (connections < randomPeerConnections) {
      var peer = Math.floor(Math.random()*regularNodes);
      if (peer == i) {
        break;
      }
      try {
        cy.add({
          data: {
            id: 'edgen' + i + 'n' + peer,
            source: 'n' + i,
            target: 'n' + peer
          },
          group: 'edges'
        });
        connections += 1;
      } catch (err) {
        console.log("collission for nodes " + i + " and " + j)
      }
    }
  }

}

/* SET UP A GRAPH */

function initGraph(regularNodes, superNodes){
  makeSuperNodes(superNodes);
  makeRegularNodes(regularNodes);
  makeEdges(regularNodes, superNodes);
  displayGraph(layoutOptions);
}

function makeGraph() {
  cy.elements().remove();
  superNodes = document.getElementById('inputText').value;
  regularNodes = document.getElementById('peerNodes').value;

  if (superNodes && regularNodes) {
    console.log("all  good! Nodes set");
  } else if (superNodes) {
    regularNodes = 100;
  } else if (regularNodes) {
    superNodes = 13;
  } else {
    regularNodes = 100;
    superNodes = 13;
  }

  initGraph(regularNodes, superNodes);
}

/* DISPLAY PATH BEWTEEN NODES */

function getShortestPath() {
  var startNode = document.getElementById('startNode').value;
  var endNode = document.getElementById('endNode').value;

  var start = "#n"+startNode;
  var end = "#n"+endNode;
  var dijkstra = cy.elements().dijkstra(cy.$(start))

  var pathTo = dijkstra.pathTo(cy.$(end));
  return pathTo;
}

function getPath_throughSuper() {
  let pathTo;
  let sSup;
  let e1;
  let e2;

  var startNode = document.getElementById('startNode').value;
  var endNode = document.getElementById('endNode').value;

  var start = cy.$("#n"+startNode);
  var end = cy.$("#n"+endNode);

  var nodesPerSupernode = Math.floor(regularNodes / superNodes);
  var startSuper = Math.floor(startNode / nodesPerSupernode);

  if (startSuper >= superNodes) {
    startSuper = superNodes - 1;
  }

  var endSuper = Math.floor(endNode / nodesPerSupernode);

  if (endSuper >= superNodes) {
    endSuper = superNodes - 1;
  }

  sSup = cy.$("#s"+startSuper);
  e1 = cy.$("#edges" + startSuper + "n" + startNode) ;

  if (startSuper != endSuper) {

    var eSup = cy.$("#s"+endSuper);
    e2 = cy.$("#edges" + startSuper + "s" + endSuper);
    var e3 = cy.$("#edges" + endSuper + "n" + endNode);

    pathTo = [start, e1, sSup, e2, eSup, e3, end]

  } else {
    e2 = cy.$("#edges" + startSuper + "n" + endNode);

    pathTo = [start, e1, sSup, e2, end]
  }

  return pathTo;
}

function playAnimations(queue, position) {
  if (position < queue.length) {
    queue[position].play().promise().then(() => {
      playAnimations(queue, position + 1);
    });
  }
  return true;
}

async function animatePath() {

  makeGraph()

  var path = await getPath_throughSuper();
  var animations = [];

  // forward animation
  for (var i=0; i<path.length; i++) {
    console.log(path[i].data('id'));

    var element = path[i].data('id');
    var ele = "#" + element;
    var ani = cy.$(ele).animation({
      style: {
        backgroundColor: 'red',
        lineColor: 'red'
      },
      duration: 1000,
      complete: function() {
        console.log('Animation complete');
      },
      queue: true
    });

    animations.push(ani);
  }

  playAnimations(animations, 0);
}

// init graph upon load
initGraph(100,13);
