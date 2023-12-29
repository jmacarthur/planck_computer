function create_subtractor_block(world, ground, offsetx, offsety, part_index, base_name, reader) {
    var pitch_y = 5;
    var max_height = pitch_y * 8;
    for(var col=0;col<8;col++) {
	var x = offsetx + col*channel_pitch;
	var y = offsety + col*pitch_y;
	var toggle = world.createBody({type: "dynamic", position: new Vec2(x,y)});
	var toggle_shapes = [];
	if(reader) {
	    var toggle_poly = new Polygon([Vec2(-1,-1), Vec2(1, -1), Vec2(0,3)]);
	    addFixture(toggle, toggle_poly, mass_normal, collisions_toplayer);
	    toggle_shapes.push(toggle_poly);
	} else {
	    var toggle_poly1 = new Polygon([Vec2(-1,-1), Vec2(1, -1), Vec2(0,3)]);
	    addFixture(toggle, toggle_poly1, mass_normal, collisions_toplayer);
	    toggle_shapes.push(toggle_poly1);
	    var toggle_poly2 = new Polygon([Vec2(-3.5,-1), Vec2(3.5, -1), Vec2(4.5, 0), Vec2(-4.5,0)]);
	    addFixture(toggle, toggle_poly2, mass_normal, collisions_toplayer);
	    toggle_shapes.push(toggle_poly2);
	}
	var toggle_shape = new Polygon();
	toggle_shape.m_vertices= union(toggle_shapes);
	toggle.shapeOverride = [toggle_shape];
	var revoluteJoint = world.createJoint(pl.RevoluteJoint({
	    enableLimit: false,
	}, ground, toggle, Vec2(x,y)));
	toggle.attach_point = Vec2(x,y+3);
	part_index[base_name+col] = toggle;

	var intakechannelleft = world.createBody({type: "static", position: new Vec2(offsetx+col*channel_pitch, offsety+col*pitch_y)});
	addFixture(intakechannelleft, box(-3, 3, 1, max_height-pitch_y*col), mass_none, collisions_toplayer);
	var intakechannelright = world.createBody({type: "static", position: new Vec2(offsetx+col*channel_pitch, offsety+col*pitch_y)});
	addFixture(intakechannelright, box(2, 7, 1, max_height-pitch_y*col-5), mass_none, collisions_toplayer);
	var outtakechannelleft = world.createBody({type: "static", position: new Vec2(offsetx+col*channel_pitch, offsety+col*pitch_y)});
	addFixture(outtakechannelleft, box(-3, -3, 1, 1), mass_none, collisions_toplayer);
	var outtakechannelcent = world.createBody({type: "static", position: new Vec2(offsetx+col*channel_pitch, offsety)});
	addFixture(outtakechannelcent, box(-1, -5, 2, col*pitch_y), mass_none, collisions_toplayer);
    }

    // Reset lever
    if(reader) {
	var reset_bar = world.createBody({type: "dynamic", position: new Vec2(offsetx, offsety)});
	var reset_shape = new Polygon([Vec2(0,0), Vec2(1,0), Vec2(8*channel_pitch+1, 8*pitch_y), Vec2(8*channel_pitch, 8*pitch_y)]);  
	addFixture(reset_bar, reset_shape, mass_normal, collisions_toplayer);

	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : 0.0,
	    upperTranslation : 2.0,
	    enableLimit : true
	}, ground, reset_bar, Vec2(0.0, 0.0), Vec2(5.0,0.0)));

    }
}
