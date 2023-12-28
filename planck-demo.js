'use strict';

window.onload = (() => {
    console.log("onload");

    var canvas = document.getElementsByTagName('canvas')[0];
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var world = planck.World({gravity: Vec2(0.0,-9.8)});
    createWorld(world);

    const renderer = new Renderer();
    renderer.start(world, canvas);

    console.log("Created world");
});

function union(polygonlist) {
    // Merge all the polygons in polygonlist into one new one.
    // The argument should be an array of arrays of coordinates; the return value is an array of coordinates.
    // Convert polygons into a form clipper will understand
    // polygon1, polygon2 should be Polygons, or other things which have the attribute m_vertices
    // All polygons should overlap! If not, it will only return the first contiguous object.
    if(polygonlist.length < 2) {
	console.log("Degenerate union ("+polygonlist.length+" entries)");
	return polygonlist;
    }

    var path1 = [[]];

    var firstpoly = polygonlist[0];
    if ('m_vertices' in firstpoly) {
	firstpoly = firstpoly.m_vertices;
    }

    for(let i=0;i<firstpoly.length;i++) {
	var v = firstpoly[i];
	path1[0].push({X:v.x, Y:v.y});
    }

    var scale = 100;
    ClipperLib.JS.ScaleUpPaths(path1, scale);
	
    for(let p=1; p<polygonlist.length; p++) {
	var path2 = [[]];
	var nextpoly = polygonlist[p];
	if('m_vertices' in nextpoly) {
	    nextpoly = nextpoly.m_vertices;
	}
	for(let i=0;i<nextpoly.length;i++) {
	    var v = nextpoly[i];
	    path2[0].push({X:v.x, Y:v.y});
	}

	ClipperLib.JS.ScaleUpPaths(path2, scale);

	var cpr = new ClipperLib.Clipper();
	cpr.AddPaths(path1, ClipperLib.PolyType.ptSubject, true);
	cpr.AddPaths(path2, ClipperLib.PolyType.ptClip, true);
	var solution_paths = new ClipperLib.Paths();
	var succeeded = cpr.Execute(ClipperLib.ClipType.ctUnion, solution_paths, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
	path1 = solution_paths;
    }
    ClipperLib.JS.ScaleDownPaths(path1, scale);

    // Convert back to planck.js polygons
    var result = [];
    for(let i=0;i<path1[0].length;i++) {
	var v = path1[0][i];
	result.push(Vec2(v.X, v.Y));
    }
    return result;

}
