from sqlalchemy.orm import sessionmaker
from app.db.session import engine
from app.models.land_parcel import LandParcel
from app.models.review_task import ReviewTask, ReviewStatus
from app.models.person import Person
from app.models.tenure import Tenure
from app.models.vgh_map import VGHMap
import uuid

def seed():
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        # Check if data exists
        person = session.query(Person).first()
        if not person:
            # Create a Person
            person = Person(
                id=str(uuid.uuid4()),
                name_urdu="محمد اسلم",
                name_english="Muhammad Aslam",
                cnic="12345-6789012-3",
                phone_number="0300-1234567"
            )
            session.add(person)
            session.commit()
            print("Person created.")
        
        if not session.query(LandParcel).first():
             # Create Land Parcels
            parcel1 = LandParcel(
                id=str(uuid.uuid4()),
                village_id="V-001",
                khasra_number="123/45",
                area_text="10 Kanal",
                area_geom=5000.0,
                status="active",
                version=1
            )
            session.add(parcel1)

            parcel2 = LandParcel(
                id=str(uuid.uuid4()),
                village_id="V-001",
                khasra_number="67/89",
                area_text="5 Marla",
                area_geom=125.0,
                status="disputed",
                version=1
            )
            session.add(parcel2)
            session.flush() # Flush to get IDs

            # Create Tenures
            tenure1 = Tenure(
                id=str(uuid.uuid4()),
                parcel_id=parcel1.id,
                person_id=person.id,
                rights_type="Owner",
                share="1.0"
            )
            session.add(tenure1)

            tenure2 = Tenure(
                id=str(uuid.uuid4()),
                parcel_id=parcel2.id,
                person_id=person.id,
                rights_type="Owner",
                share="1.0"
            )
            session.add(tenure2)

            # Create VGH Mappings
            vgh1 = VGHMap(
                id=str(uuid.uuid4()),
                village_code="V-001",
                halqa_code="H-001",
                girdawari_code="G-001",
                parcel_id=parcel1.id
            )
            session.add(vgh1)

            vgh2 = VGHMap(
                id=str(uuid.uuid4()),
                village_code="V-001",
                halqa_code="H-001",
                girdawari_code="G-002",
                parcel_id=parcel2.id
            )
            session.add(vgh2)
            
            print("Parcels, Tenures, and VGH Mappings created.")

        if not session.query(ReviewTask).first():
            # Create Review Tasks
            task1 = ReviewTask(
                id=str(uuid.uuid4()),
                document_id="DOC-001",
                document_type="Girdawari",
                confidence_score=0.65,
                extracted_fields={"owner": "Ali", "khasra": "12"},
                status=ReviewStatus.PENDING
            )
            session.add(task1)

            task2 = ReviewTask(
                id=str(uuid.uuid4()),
                document_id="DOC-002",
                document_type="Khasra",
                confidence_score=0.92,
                extracted_fields={"owner": "Ahmed", "khasra": "55"},
                status=ReviewStatus.APPROVED
            )
            session.add(task2)
            session.add(task2)
            print("Reviews created.")

        # Check for missing VGH Mappings for existing parcels
        if not session.query(VGHMap).first():
            parcels = session.query(LandParcel).all()
            for i, parcel in enumerate(parcels):
                vgh = VGHMap(
                    id=str(uuid.uuid4()),
                    village_code=parcel.village_id or "V-001",
                    halqa_code="H-001",
                    girdawari_code=f"G-00{i+1}",
                    parcel_id=parcel.id
                )
                session.add(vgh)
            if parcels:
                print("VGH Mappings backfilled for existing parcels.")

        session.commit()
        print("Data seeded successfully!")
    except Exception as e:
        print(f"Error seeding data: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    seed()
