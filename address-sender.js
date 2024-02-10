function create_address_sender(world, ground, origin_x, origin_y) {
    var sender_static = world.createBody({type: "static", position: new Vec2(origin_x, origin_y)});
    var channels = 3;

    for(var i=0;i<channels;i++) {
	var blocker_poly = new Polygon(translate_points([Vec2(0,0), Vec2(4,0), Vec2(4,1.5), Vec2(0,2)], i*decoder_x_pitch, 0));

	addFixture(sender_static, blocker_poly, mass_normal, collisions_toplayer);
    }

    return null;
}
