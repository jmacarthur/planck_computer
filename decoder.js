function create_instruction_decoder(world, ground, offsetx, offsety, part_index) {
    var profile_height = 2;
    var profile_separation = 8;
    var block_width = 3;
    var profile_trapezium = [Vec2(0,0), Vec2(block_width,0), Vec2(block_width-1,profile_height+1), Vec2(1,profile_height+1)];
    // Generate the decoder rods
    var rod_shapes = [];
    for(var rod=0;rod<3;rod++) {
	var decoder_rod = world.createBody({type: "dynamic", position: new Vec2(offsetx,offsety+profile_separation*rod)});
	var base_rod = box(-10,0, block_width*16+10+10, 1);
	addFixture(decoder_rod, base_rod, mass_normal, collisions_toplayer);
	rod_shapes.push(base_rod);
	for(var gap=0; gap<8;gap++) {
	    var offset = (gap >> rod) % 2 ==1 ? block_width:0;
	    var blocker_poly = new Polygon(translate_points(profile_trapezium, gap*2*block_width+offset, 0));
	    addFixture(decoder_rod, blocker_poly , mass_normal, collisions_toplayer);
	    rod_shapes.push(blocker_poly);
	}
	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : 0.0,
	    upperTranslation : block_width,
	    enableLimit : true
	}, ground, decoder_rod, Vec2(0.0, 0.0), Vec2(1.0,0.0)));
	var decoder_rod_shape = new Polygon();
	decoder_rod_shape.m_vertices = union(rod_shapes);
	decoder_rod.shapeOverride = [decoder_rod_shape];
    }


    var follower_trapezium = [Vec2(1,0), Vec2(block_width-1,0), Vec2(block_width,profile_height+1), Vec2(0,profile_height+1)];
    // Generate rod followers
    for(var follower=0;follower<8;follower++) {
	var follower_block = world.createBody({type: "dynamic", position: new Vec2(offsetx,offsety+profile_separation/2)});
	for(var row=0;row<3;row++) {
	    addFixture(follower_block, new Polygon(translate_points(follower_trapezium, follower*block_width*2+block_width, row*profile_separation)), mass_normal, collisions_toplayer);
	}
	addFixture(follower_block, box(follower*block_width*2+block_width-1, -1, block_width+2, 3*profile_separation+2), mass_none, collisions_none);
    }

    var driver = world.createBody({type: "dynamic", position: new Vec2(offsetx-10-5-block_width,offsety)});
    var vertical_box = box(0,0,1,profile_separation*3);
    addFixture(driver, vertical_box, mass_normal, collisions_toplayer);
    var driver_shapes = [vertical_box];
    for(var row=0;row<3;row++) {
	var tine = box(0,profile_separation*row,5,1);
	addFixture(driver, tine, mass_normal, collisions_toplayer);
	driver_shapes.push(tine);
    }
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0.0,
	upperTranslation : block_width,
	enableLimit : true
    }, ground, driver, Vec2(0.0, 0.0), Vec2(1.0,0.0)));
    var driver_shape = new Polygon();
    driver_shape.m_vertices = union(driver_shapes);
    driver.shapeOverride = [driver_shape];

    driver.attach_points = [Vec2(offsetx-10-5-block_width+0.5, offsety+1.5*profile_separation)];
    part_index['instruction_reader'] = driver;

    var blockbox = world.createBody({type: "static", position: new Vec2(offsetx-10-block_width,offsety-2)});
    for(var row=0;row<3;row++) {
	addFixture(blockbox, box(0,profile_separation*row,5,1), mass_normal, collisions_toplayer);
    }
}
