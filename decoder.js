function create_instruction_decoder(world, ground, offsetx, offsety, part_index) {
    var profile_height = 2;
    var profile_separation = 8;
    var block_width = 3;
    var profile_trapezium = [Vec2(0,0), Vec2(block_width,0), Vec2(block_width-1,profile_height+1), Vec2(1,profile_height+1)];
    // Generate the decoder rods
    for(var rod=0;rod<3;rod++) {
	var decoder_rod = world.createBody({type: "dynamic", position: new Vec2(offsetx,offsety+profile_separation*rod)});
	var base_rod = box(-10,0, block_width*16+10+10, 1);
	addUnionFixture(decoder_rod, base_rod, mass_normal, collisions_toplayer);
	for(var gap=0; gap<8;gap++) {
	    var offset = (gap >> rod) % 2 ==1 ? block_width:0;
	    var blocker_poly = new Polygon(translate_points(profile_trapezium, gap*2*block_width+offset, 0));
	    addUnionFixture(decoder_rod, blocker_poly , mass_normal, collisions_toplayer);
	}
	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : 0.0,
	    upperTranslation : block_width,
	    enableLimit : true
	}, ground, decoder_rod, Vec2(0.0, 0.0), Vec2(1.0,0.0)));
	completeUnion(decoder_rod);
    }

    var follower_trapezium = [Vec2(1,0), Vec2(block_width-1,0), Vec2(block_width,profile_height+1), Vec2(0,profile_height+1)];
    // Generate rod followers
    for(var follower=0;follower<8;follower++) {
	var follower_block = world.createBody({type: "dynamic", position: new Vec2(offsetx,offsety+profile_separation/2)});
	for(var row=-1;row<3;row++) {
	    addFixture(follower_block, new Polygon(translate_points(follower_trapezium, follower*block_width*2+block_width, row*profile_separation)), mass_normal, collisions_toplayer);
	}
	addFixture(follower_block, box(follower*block_width*2+block_width-1, -1-profile_separation, block_width+2, 4*profile_separation+2), mass_none, collisions_none);


	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : 0.0,
	    upperTranslation : 10.0,
	    enableLimit : false
	}, ground, follower_block, Vec2(0.0, 0.0), Vec2(0.0,1.0)));
    }

    var driver = world.createBody({type: "dynamic", position: new Vec2(offsetx-10-5-block_width,offsety)});
    addUnionFixture(driver, box(0,0,1,profile_separation*3), mass_normal, collisions_toplayer);
    for(var row=0;row<3;row++) {
	var driver_tine = [Vec2(0,0), Vec2(5.5,0), Vec2(6,1), Vec2(0,1)];
	addUnionFixture(driver, new Polygon(translate_points(driver_tine, 0, profile_separation*row+1.1)), mass_normal, collisions_toplayer);
    }
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0.0,
	upperTranslation : block_width+5,
	enableLimit : true
    }, ground, driver, Vec2(0.0, 0.0), Vec2(1.0,0.0)));
    completeUnion(driver);

    driver.attach_points = [Vec2(offsetx-10-5-block_width+0.5, offsety+1.5*profile_separation)];
    part_index['instruction_reader'] = driver;

    var blockbox = world.createBody({type: "static", position: new Vec2(offsetx-10-block_width,offsety-1.1)});
    for(var row=0;row<3;row++) {
	addFixture(blockbox, box(0,profile_separation*row,3.8,1), mass_normal, collisions_toplayer);
    }

    // Resetting option
    var resetter = world.createBody({type: "dynamic", position: new Vec2(offsetx+16*block_width+10+block_width,offsety)});
    addUnionFixture(resetter, box(0,0,1,profile_separation*3), mass_normal, collisions_toplayer);
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : -block_width,
	upperTranslation : 0,
	enableLimit : true
    }, ground, resetter, Vec2(0.0, 0.0), Vec2(1.0,0.0)));
    resetter.attach_points = [Vec2(offsetx+16*block_width+10+block_width+0.5, offsety+1.5*profile_separation)];
    part_index['instruction_resetter'] = resetter;

    // Follower holdoff bar
    var holdoff = world.createBody({type: "dynamic", position: new Vec2(offsetx,offsety-profile_separation*0.5-4)});
    addUnionFixture(holdoff, box(0,0,16*block_width,1), mass_normal, collisions_toplayer);
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0,
	upperTranslation : profile_separation*0.5,
	enableLimit : true
    }, ground, holdoff, Vec2(0.0, 0.0), Vec2(0.0,1.0)));
    holdoff.attach_points = [Vec2(offsetx+6*block_width, offsety-profile_separation*0.5-3.5)];
    part_index['instruction_holdoff'] = holdoff;
}
