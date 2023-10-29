'use strict';

const pl = planck;
const {Vec2, Box, Polygon, Circle} = pl;

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

function union(polygon1, polygon2) {
    // Convert polygons into a form clipper will understand
    var path1 = [[]];
    var path2 = [[]];
    for(let i=0;i<polygon1.m_vertices.length;i++) {
	var v = polygon1.m_vertices[i];
	path1[0].push({X:v.x, Y:v.y});
    }

    for(let i=0;i<polygon2.m_vertices.length;i++) {
	var v = polygon2.m_vertices[i];
	path2[0].push({X:v.x, Y:v.y});
    }

    var scale = 100;
    ClipperLib.JS.ScaleUpPaths(path1, scale);
    ClipperLib.JS.ScaleUpPaths(path2, scale);

    var cpr = new ClipperLib.Clipper();
    cpr.AddPaths(path1, ClipperLib.PolyType.ptSubject, true);
    cpr.AddPaths(path2, ClipperLib.PolyType.ptClip, true);
    var solution_paths = new ClipperLib.Paths();
    var succeeded = cpr.Execute(ClipperLib.ClipType.ctUnion, solution_paths, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    ClipperLib.JS.ScaleDownPaths(solution_paths, scale);

    // Convert back to planck.js polygons
    var result = [];
    for(let i=0;i<solution_paths[0].length;i++) {
	var v = solution_paths[0][i];
	result.push(Vec2(v.X, v.Y));
    }
    return result;
}


function multi_union(polygon1list, polygon2list) {
    // Convert polygons into a form clipper will understand
    var path1 = [[]];
    var path2 = [[]];
    for(var j=0;j<polygon1list.length;j++) {
	var polygon1 = polygon1list[j];
	path1[j] = [];
	for(let i=0;i<polygon1.m_vertices.length;i++) {
	    var v = polygon1.m_vertices[i];
	    path1[j].push({X:v.x, Y:v.y});
	}
    }

    for(var j=0;j<polygon2list.length;j++) {
	var polygon2 = polygon2list[j];
	for(let i=0;i<polygon2.m_vertices.length;i++) {
	    var v = polygon2.m_vertices[i];
	    path2[j].push({X:v.x, Y:v.y});
	}
    }

    var scale = 100;
    ClipperLib.JS.ScaleUpPaths(path1, scale);
    ClipperLib.JS.ScaleUpPaths(path2, scale);

    var cpr = new ClipperLib.Clipper();
    cpr.AddPaths(path1, ClipperLib.PolyType.ptSubject, true);
    cpr.AddPaths(path2, ClipperLib.PolyType.ptClip, true);
    var solution_paths = new ClipperLib.Paths();
    var succeeded = cpr.Execute(ClipperLib.ClipType.ctUnion, solution_paths, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    ClipperLib.JS.ScaleDownPaths(solution_paths, scale);

    // Convert back to planck.js polygons
    var result = [[]];
    for(let j=0;j<solution_paths.length;j++) {
	result[j] = {m_vertices: []};
	for(let i=0;i<solution_paths[j].length;i++) {
	    var v = solution_paths[j][i];
	    result[j].m_vertices.push(Vec2(v.X, v.Y));
	}
    }
    return result;
}
