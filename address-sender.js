function create_address_sender(world, ground, origin_x, origin_y, part_index) {
    var sender_static = world.createBody({type: "static", position: new Vec2(origin_x, origin_y)});
    var sender_moving = world.createBody({type: "dynamic", position: new Vec2(origin_x, origin_y)});
    var channels = 3;

    for(var i=0;i<channels;i++) {
	var blocker_poly = new Polygon(translate_points([Vec2(0,0), Vec2(4,0), Vec2(4,1.5), Vec2(0,2)], i*decoder_x_pitch, 0));
	addFixture(sender_static, blocker_poly, mass_normal, collisions_toplayer);
	var releaser_poly = new Polygon(translate_points([Vec2(4.1,0), Vec2(5,0), Vec2(5,4), Vec2(4.1,4)], i*decoder_x_pitch, 0));
	addFixture(sender_moving, releaser_poly, mass_normal, collisions_toplayer);
    }

    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0.0,
	upperTranslation : 2.0,
	enableLimit : false
    }, ground, sender_moving, Vec2(0.0, 0.0), Vec2(1.0,0.0)));
    sender_moving.attach_points = [new Vec2(origin_x+4.0, origin_y)];
    part_index['address-sender-release'] = sender_moving;

    return null;
}
