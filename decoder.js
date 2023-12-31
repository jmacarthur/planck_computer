function create_instruction_decoder(world, ground, offsetx, offsety, part_index) {
    var profile_height = 2;
    var profile_separation = 5;
    var profile_trapezium = [Vec2(0,0), Vec2(4,0), Vec2(3,profile_height+1), Vec2(1,profile_height+1)];
    // Generate the decoder rods
    for(var rod=0;rod<3;rod++) {
	var decoder_rod = world.createBody({type: "dynamic", position: new Vec2(offsetx,offsety+profile_separation*rod)});
	addFixture(decoder_rod, box(0,0, 20, 1), mass_normal, collisions_toplayer);
	for(var gap=0; gap<8;gap++) {
	    var offset = (gap >> rod) % 2 ==0 ? 5:0;
	    addFixture(decoder_rod, new Polygon(translate_points(profile_trapezium, gap*10+offset, 0)), mass_normal, collisions_toplayer);
	}
	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : 0.0,
	    upperTranslation : 5,
	    enableLimit : true
	}, ground, decoder_rod, Vec2(0.0, 0.0), Vec2(1.0,0.0)));

    }
}
